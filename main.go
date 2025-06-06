package main

import (
	"fmt"

	"github.com/B9O2/mtmonitor/apps"

	"github.com/B9O2/canvas/pixel"
	"github.com/B9O2/tabby"
)

func main() {

	t := tabby.NewTabby("Monitor", apps.NewMainApp(apps.NewWebMonitorApp()))
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
