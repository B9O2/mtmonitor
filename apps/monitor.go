package apps

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/B9O2/mtmonitor/core"

	"github.com/B9O2/Multitasking"
	"github.com/B9O2/Multitasking/monitor"
	"github.com/B9O2/tabby"
	"github.com/gizak/termui/v3"
	"github.com/gizak/termui/v3/widgets"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

type MainApp struct {
	*tabby.BaseApplication
}

func (ba *MainApp) Detail() (string, string) {
	return "monitor", "monitor mode"
}

func (ba *MainApp) Main(
	args tabby.Arguments,
) (*tabby.TabbyContainer, error) {
	addr := args.Get("addr").(string)
	interval := args.Get("interval").(time.Duration)
	certPath := args.Get("cert-path").(string)

	if err := termui.Init(); err != nil {
		panic("failed to initialize termui: " + err.Error())
	}
	defer termui.Close()

	var creds credentials.TransportCredentials
	var err error
	var opts []grpc.DialOption
	if certPath != "" {
		creds, err = credentials.NewClientTLSFromFile(certPath, "localhost")
		if err != nil {
			return nil, err
		}
		fmt.Printf("[-]Using credential '%s'.\n", certPath)
	} else {
		creds = insecure.NewCredentials()
		fmt.Println("[!]Ignore credential.")
	}

	opts = append(opts, grpc.WithTransportCredentials(creds))

	mc, err := Multitasking.NewMonitorClient(addr, opts...)
	if err != nil {
		return nil, err
	}

	fmt.Printf("[-]Receive status per %s\n", interval)
	statusStream, err := mc.StreamStatus(context.Background(), interval)
	if err != nil {
		return nil, err
	}

	fmt.Printf("[-]Receive events per %s\n", interval)
	eventsStream, err := mc.StreamEvents(context.Background(), interval, -1)
	if err != nil {
		return nil, err
	}

	// 滚动日志区域
	logBox := widgets.NewList()
	logBox.Title = "Logs"
	logBox.Rows = []string{"Starting system..."}
	logBox.TextStyle = termui.NewStyle(termui.ColorYellow)
	logBox.WrapText = false

	statusChan := make(chan *monitor.Status)
	go func() {
		for {
			s, err := statusStream.Receive()
			if err != nil {
				if status.Code(err) != codes.Canceled &&
					!(status.Code(err) == codes.Unavailable && strings.Contains(err.Error(), "error reading from server: EOF")) {
					logBox.Rows = append(logBox.Rows, fmt.Sprintf("Metrics Error: %s", err))
				} else {
					logBox.Rows = append(logBox.Rows, "[Metrics Stream Closed]")
				}
				break
			}
			statusChan <- s
		}
		close(statusChan)
	}()

	eventsChan := make(chan *monitor.Events)
	go func() {
		for {
			e, err := eventsStream.Receive()
			if err != nil {
				if status.Code(err) != codes.Canceled &&
					!(status.Code(err) == codes.Unavailable && strings.Contains(err.Error(), "error reading from server: EOF")) {
					logBox.Rows = append(logBox.Rows, fmt.Sprintf("Metrics Error: %s", err))
				} else {
					logBox.Rows = append(logBox.Rows, "[Metrics Stream Closed]")
				}
				break
			}
			eventsChan <- e
		}
		close(eventsChan)
	}()

	uiEvents := termui.PollEvents()
	grid := termui.NewGrid()
	termWidth, termHeight := termui.TerminalDimensions()
	grid.SetRect(0, 0, termWidth, termHeight)

	var lastMetrics *core.Metrics
	loop := true
	for loop {
		select {
		case e := <-uiEvents:
			switch e.Type {
			case termui.KeyboardEvent:
				loop = false
			case termui.ResizeEvent:
				w, h := termui.TerminalDimensions()
				grid.SetRect(0, 0, w, h)
				termui.Clear()
				termui.Render(grid)
			}
		case e := <-eventsChan:
			if e == nil {
				loop = false
				break
			}
			logBox.Rows = append(logBox.Rows, e.Logs...)
			logBox.ScrollBottom()
		case s := <-statusChan:
			if s == nil {
				loop = false
				break
			}
			//fmt.Println("Reading...")
			metrics := core.NewMetrics(s, lastMetrics, interval)
			lastMetrics = metrics

			//fmt.Print(metrics, "\n\n")

			// logBox.Rows = append(logBox.Rows, strings.Split(fmt.Sprintf("[%s] %s",
			// 	time.Now().Format("15:04:05"), metrics), "\n")...)

			grid.Set(
				termui.NewRow(0.8,
					termui.NewCol(0.8, logBox),
					termui.NewCol(0.2, metrics.StatsTable()),
				),
				termui.NewRow(0.2, metrics.ThreadsCountChart()),
			)

			// 渲染更新后的 UI
			termui.Render(grid)

		}

	}
	loop = true
	for loop {
		e := <-uiEvents
		switch e.Type {
		case termui.KeyboardEvent:
			loop = false
		}
	}

	return nil, nil
}

func NewMainApp(apps ...tabby.Application) *MainApp {
	ba := &MainApp{
		tabby.NewBaseApplication(false, apps),
	}
	ba.SetParam("addr", "address", tabby.String(nil), "a")
	ba.SetParam("cert-path", "cert path", tabby.String(""), "cp")
	ba.SetParam("interval", "message interval", tabby.Duration(time.Second), "i")
	return ba
}
