import React, { useMemo } from 'react';
import { LogEntry } from '../../types';

interface LogPanelProps {
  logs: LogEntry[];
  logFilter: string;
  levelFilter: string;
  threadFilter: string;
  setLogFilter: (filter: string) => void;
  setLevelFilter: (level: string) => void;
  setThreadFilter: (thread: string) => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ 
  logs, 
  logFilter, 
  levelFilter, 
  setLogFilter, 
  setLevelFilter,
  threadFilter = 'ALL',
  setThreadFilter = () => {}
}) => {
  // 日志颜色映射函数
  const getLogLevelColor = (level: string): string => {
    switch (level.toUpperCase()) {
      case 'ERROR': return '#ef4444';
      case 'WARNING':
      case 'WARN': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      case 'DEBUG': return '#10b981';
      default: return '#94a3b8';
    }
  };

  // 提取所有不同的线程ID
  const threadIds = useMemo(() => {
    const uniqueThreads = new Set<string | number>();
    logs.forEach(log => {
      if (log.thread_id !== undefined) {
        uniqueThreads.add(log.thread_id);
      }
    });
    return Array.from(uniqueThreads).sort((a, b) => 
      typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
    );
  }, [logs]);

  // 过滤日志
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 级别筛选
      if (levelFilter !== 'ALL' && log.level?.toUpperCase() !== levelFilter) {
        return false;
      }
      
      // 文本筛选
      if (logFilter && !log.message?.toLowerCase().includes(logFilter.toLowerCase())) {
        return false;
      }
      
      // 线程筛选
      if (threadFilter !== 'ALL' && String(log.thread_id) !== threadFilter) {
        return false;
      }
      
      return true;
    });
  }, [logs, logFilter, levelFilter, threadFilter]);

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-slate-700/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-700/30 gap-3">
        <h2 className="text-lg font-semibold flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          系统日志
        </h2>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select 
            value={levelFilter} 
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm border border-slate-600 hover:border-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors duration-200 flex-1 md:flex-none"
          >
            <option value="ALL">所有级别</option>
            <option value="ERROR">错误</option>
            <option value="WARNING">警告</option>
            <option value="INFO">信息</option>
            <option value="DEBUG">调试</option>
          </select>
          
          {/* 添加线程筛选下拉菜单 */}
          <select 
            value={threadFilter} 
            onChange={(e) => setThreadFilter(e.target.value)}
            className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm border border-slate-600 hover:border-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors duration-200 flex-1 md:flex-none"
          >
            <option value="ALL">所有线程</option>
            {threadIds.map(id => (
              <option key={String(id)} value={String(id)}>
                Thread-{id}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="搜索日志..."
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value)}
            className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm border border-slate-600 hover:border-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors duration-200 flex-1"
          />
        </div>
      </div>
      <div className="h-[28rem] overflow-y-auto p-3 bg-slate-800/50 font-mono scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log: LogEntry, index) => {
            // 否则，格式化显示日志条目
            return (
              <div key={index} className="flex gap-2 mb-1.5 pb-1 border-b border-slate-700/50 text-sm items-baseline hover:bg-slate-700/20 transition-colors duration-150 p-1 rounded">
                <span className="text-slate-400 text-xs whitespace-nowrap">{log.time}</span>
                <span 
                  className="font-medium px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: `${getLogLevelColor(log.level)}20`, color: getLogLevelColor(log.level) }}
                >
                  {log.level}
                </span>
                <span className="text-purple-400 whitespace-nowrap text-xs">Thread-{log.thread_id}</span>
                <span className="text-slate-300 break-words flex-1">{log.message}</span>
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center h-full text-slate-400 italic">
            {logs.length > 0 ? '没有匹配的日志' : '暂无日志数据'}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogPanel;