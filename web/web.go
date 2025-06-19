package web

import (
	"context"
	"fmt"
	"io/fs"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/B9O2/Multitasking"
	"github.com/B9O2/NStruct/Shield"
	monitor_core "github.com/B9O2/monitors/core"
	"github.com/B9O2/monitors/monitor"

	"github.com/B9O2/mtmonitor/core"
	"github.com/B9O2/mtmonitor/runtime"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

type MTCore struct {
	*runtime.CoreConfig
	Context          context.Context
	Cancel           context.CancelFunc
	IntervalDuration time.Duration
}

func (m *MTCore) Address() string {
	return fmt.Sprintf("%s:%d", m.Host, m.Port)
}

type Credential struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

func NewCredential(name string, cc runtime.CredentialConfig) *Credential {
	return &Credential{
		Name: name,
		Path: cc.Path,
	}
}

func NewCredentials(cfg map[string]runtime.CredentialConfig) []*Credential {
	credentials := make([]*Credential, 0, len(cfg))
	for name, cc := range cfg {
		credentials = append(credentials, NewCredential(name, cc))
	}
	return credentials
}

func HandleCore(mtCore *MTCore, certPath string) (chan *core.Metrics, chan *monitor.Events, error) {
	var creds credentials.TransportCredentials
	var err error
	var opts []grpc.DialOption
	metricsChan := make(chan *core.Metrics)
	eventsChan := make(chan *monitor.Events)

	if certPath != "" {
		creds, err = credentials.NewClientTLSFromFile(certPath, "localhost")
		if err != nil {
			return nil, nil, err
		}
	} else {
		creds = insecure.NewCredentials()
	}

	opts = append(opts, grpc.WithTransportCredentials(creds))

	mc, err := monitor_core.NewMonitorClient(mtCore.Address(), opts...)
	if err != nil {
		return nil, nil, err
	}

	// 获取状态流
	statusStream, err := mc.StreamStatus(context.Background(), mtCore.IntervalDuration)
	if err != nil {
		mc.Close()
		return nil, nil, err
	}

	// 获取事件流
	eventsStream, err := mc.StreamEvents(context.Background(), mtCore.IntervalDuration, -1)
	if err != nil {
		mc.Close()
		return nil, nil, err
	}

	// 处理状态流
	go func() {
		lastMetrics := &core.Metrics{}
		loop := true
		for loop {
			select {
			case <-mtCore.Context.Done():
				loop = false
				continue
			default:
			}

			s, err := statusStream.Receive()
			if err != nil {
				if status.Code(err) != codes.Canceled &&
					!(status.Code(err) == codes.Unavailable && strings.Contains(err.Error(), "error reading from server: EOF")) {
					// 处理错误
				}
				break
			}
			metrics := core.NewMetrics(s, lastMetrics, mtCore.IntervalDuration, mtCore.HealthCheck)
			metricsChan <- metrics
			lastMetrics = metrics
		}

		close(metricsChan)
		mc.Close()
	}()

	// 处理事件流
	go func() {
		loop := true
		for loop {
			select {
			case <-mtCore.Context.Done():
				loop = false
				continue
			default:
			}

			e, err := eventsStream.Receive()
			if err != nil {
				if status.Code(err) != codes.Canceled &&
					!(status.Code(err) == codes.Unavailable && strings.Contains(err.Error(), "error reading from server: EOF")) {
					// 处理错误
					fmt.Println("Error receiving events:", err)
				}
				break
			}
			if e == nil {
				e = &monitor.Events{
					Logs: make([]string, 0),
				}
			}
			eventsChan <- e
		}
		close(eventsChan)
		mc.Close()
	}()

	return metricsChan, eventsChan, nil
}

type MonitorWebServer struct {
	render      *gin.Engine
	cores       sync.Map
	wsconns     map[*websocket.Conn]bool
	shield      *Shield.Shield
	upgrader    websocket.Upgrader
	credentials []*Credential
}

func (mws *MonitorWebServer) AddCore(name string, cfg runtime.CoreConfig) error {
	if _, ok := mws.cores.Load(name); ok {
		return fmt.Errorf("core with name %s already exists", name)
	}

	index := slices.IndexFunc(mws.credentials, func(c *Credential) bool {
		return c.Name == cfg.Credential
	})
	if index == -1 {
		return fmt.Errorf("credential with name %s does not exist", cfg.Credential)
	}
	cred := mws.credentials[index]

	interval := time.Duration(0)
	if i, err := time.ParseDuration(cfg.Interval); err != nil {
		return err
	} else {
		interval = i
	}

	ctx, cancel := context.WithCancel(context.Background())
	core := &MTCore{
		CoreConfig:       &cfg,
		Context:          ctx,
		Cancel:           cancel,
		IntervalDuration: interval,
	}

	mws.cores.Store(name, core)

	go func() {
		name := name
		loop := true
		for loop {
			select {
			case <-ctx.Done():
				loop = false
				continue
			default:
			}
			//fmt.Printf("Starting core %s at %s with interval %s\n", name, core.Address(), interval)
			metricsChan, eventsChan, err := HandleCore(core, cred.Path)
			if err == nil {
				fmt.Println("Core", name, "is running at", core.Address())
				loop := true
				for loop {
					select {
					case metrics := <-metricsChan:
						if metrics == nil {
							fmt.Printf("Core %s metrics channel closed\n", name)
							loop = false
							break
						}

						mws.Broadcast(name, "metrics", metrics)
					case events := <-eventsChan:
						if events == nil {
							fmt.Printf("Core %s events channel closed\n", name)
							loop = false
							break
						}

						mws.Broadcast(name, "events", events)
					case <-ctx.Done():
						Multitasking.TryClose(metricsChan)
						Multitasking.TryClose(eventsChan)
						loop = false

					}
				}
			} else {
				fmt.Printf("[%s]Error handling core: %v\n", name, err)
			}
			//fmt.Printf("Core %s has been stopped\n", name)
			time.Sleep(core.IntervalDuration) // 等待下一个周期
		}

	}()
	return nil
}

func (mws *MonitorWebServer) RemoveCore(name string) error {
	if core, ok := mws.cores.Load(name); ok {
		if mtCore, ok := core.(*MTCore); ok {
			mtCore.Cancel()        // 取消处理
			mws.cores.Delete(name) // 从map中删除
		}
		return nil
	} else {
		return fmt.Errorf("core with name %s does not exist", name)
	}
}

func (mws *MonitorWebServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := mws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("Failed to upgrade connection: %v\n", err)
		return
	}

	// 处理断开连接
	defer func() {
		fmt.Println("WebSocket connection closed")
		conn.Close()
		mws.shield.Protect(func() {
			delete(mws.wsconns, conn)
		})
	}()

	// 添加连接到列表
	mws.shield.Protect(func() {
		mws.wsconns[conn] = true
	})

	// 读取消息循环
	for {
		// 重置读取超时
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		_, message, err := conn.ReadMessage()
		if err != nil {
			fmt.Printf(time.Now().Format(time.RFC3339Nano)+" WebSocket error: %v\n", err)
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {

			}
			break
		}

		// 处理客户端消息（如果有需要）
		fmt.Printf("Received message: %s\n", message)
	}
}

func (mws *MonitorWebServer) Broadcast(name string, dataType string, data any) {
	mws.shield.Protect(func() {
		for conn := range mws.wsconns {
			if err := conn.WriteJSON(gin.H{
				"name": name,
				"type": dataType,
				"data": data,
			}); err != nil {
				conn.Close()
				delete(mws.wsconns, conn)
			}
		}
	})
}

func (mws *MonitorWebServer) Start(host string, port int) error {
	mws.render.Run(fmt.Sprintf("%s:%d", host, port))
	return nil
}

func NewMonitorWebServer(credentials []*Credential, uiFiles fs.FS) *MonitorWebServer {
	render := gin.Default()

	// 启用CORS
	render.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	server := &MonitorWebServer{
		render:  render,
		cores:   sync.Map{},
		wsconns: make(map[*websocket.Conn]bool),
		shield:  Shield.NewShield(),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // 允许所有来源的WebSocket连接
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
		credentials: credentials,
	}

	server.SetRoutes(uiFiles)

	return server
}
