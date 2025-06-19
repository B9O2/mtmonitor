package main

import (
	"embed"
	"fmt"
	"io/fs"

	"github.com/B9O2/mtmonitor/apps"

	"github.com/B9O2/canvas/pixel"
	"github.com/B9O2/tabby"
)

//go:embed ui/dist
var uiFiles embed.FS

func main() {
	subFS, err := fs.Sub(uiFiles, "ui/dist")
	if err != nil {
		panic(fmt.Sprintf("Failed to create sub filesystem: %v", err))
	}
	t := tabby.NewTabby("Monitor", apps.NewWebMonitorApp(subFS))
	tc, err := t.Run(nil)
	if err != nil {
		fmt.Printf("[x]Error: %s\n", err)
		return
	}

	if tc != nil {
		err = tc.Display(pixel.Space)
		if err != nil {
			fmt.Printf("[x]Error: %s\n", err)
			return
		}
	}
}
