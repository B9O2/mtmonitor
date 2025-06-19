package core

import (
	"fmt"
	"strings"
	"time"

	"github.com/B9O2/Multitasking/monitor"
	"github.com/B9O2/mtmonitor/runtime"
	"github.com/gizak/termui/v3"
	"github.com/gizak/termui/v3/widgets"
)

type HealthIssues []HealthIssue

func (hi *HealthIssues) ThreadBlockingIssue(threadID int, description string) {
	*hi = append(*hi, HealthIssue{
		Type:        "thread-blocking",
		Title:       "线程阻塞",
		Description: description,
		ThreadID:    threadID,
		Alert:       false,
	})

}

func (hi *HealthIssues) Append(title string, description string, alert bool) {
	*hi = append(*hi, HealthIssue{
		Type:        "core-health-issue",
		Title:       title,
		Description: description,
		ThreadID:    -1,
		Alert:       alert,
	})
}

type HealthIssue struct {
	Type        string `json:"type"` //
	Title       string `json:"title"`
	Description string `json:"description"`
	Alert       bool   `json:"alert"`
	ThreadID    int    `json:"thread_id"` // 相关线程ID
}

type Metrics struct {
	*monitor.Status
	Speed               float64      `json:"speed"`
	Idle                uint64       `json:"idle"`
	Working             uint64       `json:"working"`
	ThreadsWorkingTimes []uint       `json:"threads_working_times"`
	HealthIssues        HealthIssues `json:"health_issues"`
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

func NewMetrics(status *monitor.Status, lastMetrics *Metrics, interval time.Duration, healthCheckConfig runtime.HealthCheckConfig) *Metrics {
	var speed float64
	var healthIssues HealthIssues

	threadsWorkingTimes := make([]uint, len(status.ThreadsDetail.ThreadsStatus))
	if lastMetrics != nil && lastMetrics.Status != nil {
		speed = float64((status.TotalResult - lastMetrics.TotalResult)) / interval.Seconds()

		for tid := range status.ThreadsDetail.ThreadsStatus {
			if status.ThreadsDetail.ThreadsStatus[tid] == 1 && status.ThreadsDetail.ThreadsCount[tid] == lastMetrics.ThreadsDetail.ThreadsCount[tid] {
				threadsWorkingTimes[tid] += 1
				if threadsWorkingTimes[tid] >= healthCheckConfig.MaxWorkingIntervalTimes {
					healthIssues.ThreadBlockingIssue(
						tid,
						fmt.Sprintf("Thread %d has been working for %d intervals, which exceeds the maximum allowed of %d intervals.", tid, threadsWorkingTimes[tid], healthCheckConfig.MaxWorkingIntervalTimes),
					)
				}
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

	if working == 0 {
		healthIssues.Append(
			"No Threads Working",
			"All threads are idle, which may indicate a lack of tasks or an issue with task distribution.",
			true,
		)
	} else {
		usage := float32(working) / float32(len(status.ThreadsDetail.ThreadsStatus))
		//fmt.Printf("Thread Usage: %.2f%%\n", usage*100)
		if usage < healthCheckConfig.MinUsageRate {
			healthIssues.Append(
				"Low Thread Usage",
				fmt.Sprintf("Only %.2f%% of threads are working, which is below the minimum usage rate of %.2f%%.", usage*100, healthCheckConfig.MinUsageRate*100),
				false,
			)
		}
	}

	metrics := &Metrics{
		Status:              status,
		Speed:               speed,
		Idle:                idle,
		Working:             working,
		ThreadsWorkingTimes: threadsWorkingTimes,

		HealthIssues: healthIssues,
	}
	return metrics
}
