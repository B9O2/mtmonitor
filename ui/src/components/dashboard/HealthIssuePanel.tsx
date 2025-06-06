import React, { useState, useMemo } from 'react';
import { CoreMetricsWithStatus } from '../../contexts/AppDataContext';
import { ParseIntervalToMs } from '../../utils/time';

interface HealthIssuePanelProps {
  metrics: CoreMetricsWithStatus | null;
  interval: string; // 间隔时间字符串，如"1s"
}

interface HealthEvent {
  threadId: number;
  workingTime: number; // 以间隔为单位的工作时间
  severity: 'warning' | 'critical'; // 严重程度
}

const HealthIssuePanel: React.FC<HealthIssuePanelProps> = ({ metrics, interval,}) => {
  // 阈值设置（默认为3倍间隔）
  const [threshold, setThreshold] = useState<number>(3);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // 将间隔字符串转换为毫秒
  const intervalMs = ParseIntervalToMs(interval); 
  
  // 计算间隔的可读格式
  const formatDuration = (multiplier: number): string => {
    const totalMs = intervalMs * multiplier;
    
    if (totalMs < 1000) {
      return `${totalMs}毫秒`;
    } else if (totalMs < 60000) {
      return `${(totalMs / 1000).toFixed(1)}秒`;
    } else {
      const minutes = Math.floor(totalMs / 60000);
      const seconds = Math.floor((totalMs % 60000) / 1000);
      return `${minutes}分${seconds > 0 ? ` ${seconds}秒` : ''}`;
    }
  };
  
  // 分析健康事件
  const healthEvents = useMemo<HealthEvent[]>(() => {
    if (!metrics || !metrics.threads_detail || !metrics.threads_working_times) {
      return [];
    }
    
    // 从线程工作时间中生成健康事件
    return metrics.threads_working_times
      .map((time, index) => {
        const severity: 'warning' | 'critical' = time >= threshold * 2 ? 'critical' : 'warning';
        return {
          threadId: index,
          workingTime: time,
          severity
        };
      })
      .filter(event => event.workingTime >= threshold) // 只保留超过阈值的线程
      .sort((a, b) => b.workingTime - a.workingTime); // 按工作时间降序排序
  }, [metrics, threshold]);
  
  // 保存阈值设置
  const saveThreshold = (value: number) => {
    if (value >= 1) {
      setThreshold(value);
      setShowSettings(false);
    }
  };
  
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-slate-700/50">
      <div className="flex justify-between items-center p-4 bg-slate-700/30">
        <h2 className="text-lg font-semibold flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          健康事件监控
        </h2>
        <div className="flex items-center">
          {showSettings ? (
            <div className="flex items-center space-x-2">
              <input 
                type="number" 
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-slate-800 text-white px-2 py-1 rounded-md text-sm border border-slate-600 w-16"
              />
              <span className="text-sm text-slate-400">倍间隔</span>
              <button 
                onClick={() => saveThreshold(threshold)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md text-sm"
              >
                保存
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-md text-sm"
              >
                取消
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowSettings(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-md text-sm flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              设置阈值 ({threshold}倍间隔)
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4 max-h-[350px] overflow-y-auto">
        {healthEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            {metrics ? '暂无健康事件' : '等待数据中...'}
          </div>
        ) : (
          <div className="space-y-3">
            {healthEvents.map((event) => (
              <div 
                key={event.threadId}
                className={`p-3 rounded-lg border ${
                  event.severity === 'critical' 
                    ? 'bg-red-900/30 border-red-700' 
                    : 'bg-yellow-900/30 border-yellow-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium">
                    线程 #{event.threadId}
                  </div>
                  <div className={`px-2 py-0.5 rounded text-sm ${
                    event.severity === 'critical' ? 'bg-red-700' : 'bg-yellow-700'
                  }`}>
                    {event.severity === 'critical' ? '严重' : '警告'}
                  </div>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  已连续工作: <span className="font-mono font-medium">{event.workingTime}</span> 个间隔
                  {intervalMs > 0 && ` (约 ${formatDuration(event.workingTime)})`}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  线程可能存在阻塞或长时间运行的任务
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-slate-700/20 p-3 text-xs text-slate-400 border-t border-slate-700/50">
        当线程工作时间超过阈值（当前设置为 {threshold} 倍间隔，约 {formatDuration(threshold)}）时将显示在此列表中。
        {metrics && metrics.threads_detail && metrics.threads_working_times && (
          <span className="ml-1">
            当前监控 {metrics.threads_working_times.length} 个线程。
          </span>
        )}
      </div>
    </div>
  );
};

export default HealthIssuePanel;