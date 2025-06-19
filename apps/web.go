package apps

import (
	"fmt"
	"io/fs"

	"github.com/B9O2/mtmonitor/runtime"
	"github.com/B9O2/mtmonitor/web"
	"github.com/B9O2/tabby"
)

type WebMonitorApp struct {
	*tabby.BaseApplication
	subFS fs.FS
}

func (wma *WebMonitorApp) Detail() (string, string) {
	return "web", "Web-based monitoring interface"
}

func (wma *WebMonitorApp) Main(args tabby.Arguments) (*tabby.TabbyContainer, error) {
	if args.Get("help").(bool) {
		wma.Help("Multitasking Web Monitor")
		return nil, nil
	}
	host := args.Get("server").(string)
	port := args.Get("port").(int)
	cfg, err := runtime.LoadConfig(args.Get("config").(string))
	if err != nil {
		return nil, err
	}

	server := web.NewMonitorWebServer(web.NewCredentials(cfg.Credentials), wma.subFS)
	for name, core := range cfg.Cores {

		err = server.AddCore(name, core)
		if err != nil {
			return nil, err
		}
		fmt.Printf("[-]Core '%s' added with host %s:%d and interval %s.\n",
			name, core.Host, core.Port, core.Interval)
	}

	return nil, server.Start(host, port)
}

func NewWebMonitorApp(subFS fs.FS) *WebMonitorApp {
	app := &WebMonitorApp{
		BaseApplication: tabby.NewBaseApplication(false, nil),
		subFS:           subFS,
	}
	app.SetParam("server", "web server host", tabby.String("0.0.0.0"), "s")
	app.SetParam("port", "web server port", tabby.Int(9783), "p")
	app.SetParam("config", "configuration file path", tabby.String("config.toml"), "c")
	app.SetParam("help", "show help", tabby.Bool(false), "h")
	return app
}
