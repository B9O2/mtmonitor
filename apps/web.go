package apps

import (
	"fmt"
	"time"

	"github.com/B9O2/mtmonitor/runtime"
	"github.com/B9O2/mtmonitor/web"
	"github.com/B9O2/tabby"
)

type WebMonitorApp struct {
	*tabby.BaseApplication
}

func (wma *WebMonitorApp) Detail() (string, string) {
	return "web", "Web-based monitoring interface"
}

func (wma *WebMonitorApp) Main(
	args tabby.Arguments,
) (*tabby.TabbyContainer, error) {
	host := args.Get("server").(string)
	port := args.Get("port").(int)
	cfg, err := runtime.LoadConfig(args.Get("config").(string))
	if err != nil {
		return nil, err
	}

	server := web.NewMonitorWebServer(web.NewCredentials(cfg.Credentials))
	for name, core := range cfg.Cores {
		interval := time.Duration(0)
		if i, err := time.ParseDuration(core.Interval); err != nil {
			return nil, err
		} else {
			interval = i
		}
		err = server.AddCore(name, core.Host, core.Port, interval, core.Credential)
		if err != nil {
			return nil, err
		}
		fmt.Printf("[-]Core '%s' added with host %s:%d and interval %s.\n",
			name, core.Host, core.Port, core.Interval)
	}

	return nil, server.Start(host, port)
}

func NewWebMonitorApp() *WebMonitorApp {
	app := &WebMonitorApp{
		tabby.NewBaseApplication(false, nil),
	}
	app.SetParam("server", "web server host", tabby.String("0.0.0.0"), "s")
	app.SetParam("port", "web server port", tabby.Int(9783), "p")
	app.SetParam("config", "configuration file path", tabby.String("config.toml"), "c")
	return app
}
