package core

import (
	"fmt"
	"strings"
	"time"

	"github.com/B9O2/Multitasking/monitor"
	"github.com/gizak/termui/v3"
	"github.com/gizak/termui/v3/widgets"
)

type Metrics struct {
	*monitor.Status
	Speed               float64 `json:"speed"`
	Idle                uint64  `json:"idle"`
	Working             uint64  `json:"working"`
	ThreadsWorkingTimes []uint  `json:"threads_working_times"`
	Interval            string  `json:"interval"`
}

func (m *Metrics) ThreadsCountChart() *widgets.BarChart {
	barChart := widgets.NewBarChart()
	barChart.Title = "Thread Usage"
	for tid, n := range m.Status.ThreadsDetail.ThreadsCount {
		barChart.Labels = append(barChart.Labels, fmt.Sprint(tid))
		barChart.Data = append(barChart.Data, float64(n))
	}
	barChart.BarColors = []termui.Color{termui.ColorRed, termui.ColorGreen, termui.ColorBlue}
	barChart.LabelStyles = []termui.Style{termui.NewStyle(termui.ColorWhite)}
	barChart.NumStyles = []termui.Style{termui.NewStyle(termui.ColorBlack)}
	return barChart
}

func (m *Metrics) StatsTable() *widgets.Table {
	table := widgets.NewTable()
	table.Title = "System Stats"
	table.Rows = [][]string{
		{"Metric", "Value"},
		{"Task", fmt.Sprint(m.Status.TotalTask)},
		{"Retry", fmt.Sprint(m.Status.TotalRetry)},
		{"Max Retry Queue", fmt.Sprint(m.Status.RetrySize)},
		{"Result", fmt.Sprint(m.Status.TotalResult)},
		{"Usage Rate", fmt.Sprintf("%.2f%%", float64(m.Working)/float64(len(m.ThreadsDetail.ThreadsStatus))*100)},
		{"Working", fmt.Sprintf("%d/%d", m.Working, len(m.ThreadsDetail.ThreadsStatus))},
		{"Idle", fmt.Sprint(m.Idle)},
	}

	if m.Speed != 0 {
		table.Rows = append(table.Rows, []string{"Speed", fmt.Sprintf("%.2f/s", m.Speed)})
	} else {
		table.Rows = append(table.Rows, []string{"Speed", "------"})
	}

	table.TextStyle = termui.NewStyle(termui.ColorWhite)
	table.RowSeparator = false
	table.FillRow = true
	table.RowStyles[0] = termui.NewStyle(termui.ColorYellow, termui.ColorClear, termui.ModifierBold)

	return table
}

func (m *Metrics) String() string {
	var builder strings.Builder
	builder.WriteString(fmt.Sprint(" Task: ", m.Status.TotalTask))
	builder.WriteString(fmt.Sprint(" Retry: ", m.Status.TotalRetry))
	builder.WriteString(fmt.Sprint(" Max Retry Queue: ", m.Status.RetrySize))
	builder.WriteString(fmt.Sprint(" Result: ", m.Status.TotalResult, "\n"))
	builder.WriteString(fmt.Sprintf(" Usage Rate: %.2f%%", float64(m.Working)/float64(len(m.ThreadsDetail.ThreadsStatus))*100))
	builder.WriteString(fmt.Sprintf(" Working: %d/%d", m.Working, len(m.ThreadsDetail.ThreadsStatus)))
	builder.WriteString(fmt.Sprintf(" Idle: %d\n", m.Idle))
	if m.Speed != 0 {
		builder.WriteString(fmt.Sprintf(" Speed: %f/s", m.Speed))
	} else {
		builder.WriteString(" Speed: ------")
	}
	return builder.String()
}

func NewMetrics(status *monitor.Status, lastMetrics *Metrics, interval time.Duration) *Metrics {
	var speed float64

	threadsWorkingTimes := make([]uint, len(status.ThreadsDetail.ThreadsStatus))
	if lastMetrics != nil && lastMetrics.Status != nil {
		speed = float64((status.TotalResult - lastMetrics.TotalResult)) / interval.Seconds()

		for tid := range status.ThreadsDetail.ThreadsStatus {
			if status.ThreadsDetail.ThreadsStatus[tid] == 1 && status.ThreadsDetail.ThreadsCount[tid] == lastMetrics.ThreadsDetail.ThreadsCount[tid] {
				threadsWorkingTimes[tid] += 1
			} else {
				threadsWorkingTimes[tid] = 0
			}
		}
	}

	idle := uint64(0)
	working := uint64(0)

	for _, ts := range status.ThreadsDetail.ThreadsStatus {
		if ts == 1 {
			working += 1
		} else {
			idle += 1
		}
	}

	metrics := &Metrics{
		Status:              status,
		Speed:               speed,
		Idle:                idle,
		Working:             working,
		ThreadsWorkingTimes: threadsWorkingTimes,
		Interval:            interval.String(),
	}
	return metrics
}
