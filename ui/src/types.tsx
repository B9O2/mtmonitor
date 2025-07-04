// 与后端数据结构匹配的接口定义
export interface ThreadsDetail {
  threads_status: number[]; // 下划线形式与后端匹配
  threads_count: number[];  // 下划线形式与后端匹配
}

export interface HealthIssue {
  title: string;
  description: string;
  alert: boolean;
  thread_id: number;
  type: string;
}

export interface Metrics {
  name: string;
  total_task: number;      // 下划线形式与后端匹配
  total_retry?: number;    // 可能不存在，标记为可选
  total_result: number;    // 下划线形式与后端匹配
  retry_size?: number;     // 可能不存在，标记为可选
  threads_detail: ThreadsDetail; // 下划线形式与后端匹配
  speed: number;
  idle: number;
  working: number;
  threads_working_times: number[]; // 下划线形式与后端匹配
  health_issues: HealthIssue[];    // 添加健康问题数组
  interval: string;
}

// 线程计数数据点（用于图表）
export interface ThreadCountDataPoint {
  time: string;
  active: number;   
  total: number;    
}

// 直方图数据点
export interface HistogramDataPoint {
  name: string;
  value: number;
}


// 日志级别枚举
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// 日志条目接口
export interface LogEntry {
  time: string;
  level: LogLevel;
  thread_id?: number;
  message: string;
  context?: Record<string, unknown>;
  [key: string]: unknown; // 允许其他可能的字段，但避免使用 any
}

// WebSocket消息接口定义
interface WebSocketMetricsMessage {
  data: Metrics;
  name: string;
  type: 'metrics';
}

interface WebSocketEventsMessage {
  data: {
    logs: string[];
  };
  name: string;
  type: 'events';
}

export type WebSocketMessage = WebSocketMetricsMessage | WebSocketEventsMessage;

// 添加到现有类型定义中

// 线程计数数据点类型
export interface ThreadCountDataPoint {
  time: string;
  active: number;
  total: number;
}

// 直方图数据点类型
export interface HistogramDataPoint {
  name: string;
  value: number;
}