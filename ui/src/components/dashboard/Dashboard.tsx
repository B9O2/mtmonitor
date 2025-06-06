import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { useAppData } from '../../contexts/AppDataContext';
import { ThreadCountDataPoint, HistogramDataPoint } from '../../types';
// 导入日期处理库
import dayjs from 'dayjs';

// 导入子组件
import ConnectionStatus from './ConnectionStatus';
import LogPanel from './LogPanel';
import StatusPanel from './StatusPanel';
import ThreadChart from './ThreadChart';
import TaskDistributionChart from './TaskDistributionChart';
import ThreadWorkloadChart from './ThreadWorkloadChart';
import ThreadStatus from './ThreadStatus';
import HealthIssuePanel from './HealthIssuePanel';

const Dashboard: React.FC = () => {
  // 从URL参数获取核心名称
  const { coreName } = useParams<{ coreName: string }>();
  const { isConnected } = useWebSocketContext();
  const { getMetricsForCore, getLogsForCore, setSelectedCore, getCoreInterval } = useAppData();
  
  // 组件本地状态
  const [threadCountData, setThreadCountData] = useState<ThreadCountDataPoint[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [threadFilter, setThreadFilter] = useState('ALL');

  // 当组件加载时，设置当前选中的核心
  useEffect(() => {
    if (coreName) {
      setSelectedCore(coreName);
    }
    
    // 组件卸载时清除选择
    return () => setSelectedCore(null);
  }, [coreName, setSelectedCore]);

  // 获取当前核心的数据
  const coreMetrics = coreName ? getMetricsForCore(coreName) : null;
  const coreLogs = coreName ? getLogsForCore(coreName) : [];

  // 线程计数数据更新
  useEffect(() => {
    if (coreMetrics) {
      // 使用 dayjs 替代 moment
      const now = dayjs().format('HH:mm:ss');
      setThreadCountData(prev => {
        const newData = [...prev, {
          time: now,
          active: coreMetrics.working,
          total: coreMetrics.threads_detail.threads_status.length
        }];
        
        if (newData.length > 20) {
          return newData.slice(newData.length - 20);
        }
        return newData;
      });
    }
  }, [coreMetrics]);

  // 创建直方图数据
  const getHistogramData = (): HistogramDataPoint[] => {
    if (!coreMetrics) return [];
    
    return [
      { name: '执行中', value: coreMetrics.working },
      { name: '已完成', value: coreMetrics.total_result },
      { name: '重试', value: coreMetrics.total_retry || 0 }
    ];
  };

  // 计算使用率
  const getUsageRate = (): string => {
    if (!coreMetrics || coreMetrics.threads_detail.threads_status.length === 0) return "0.00";
    const rate = (coreMetrics.working / coreMetrics.threads_detail.threads_status.length) * 100;
    return rate.toFixed(2);
  };

  // 获取当前核心的间隔
  const interval = coreName ? getCoreInterval(coreName) : '1s';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 md:p-6">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <Link to="/" className="text-blue-400 hover:text-blue-300 mb-2 inline-block">
            &larr; 返回核心列表
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            Multitasking {coreName}
          </h1>
        </div>
        <ConnectionStatus isConnected={isConnected} />
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 日志面板 */}
        <LogPanel 
          logs={coreLogs} 
          logFilter={logFilter} 
          levelFilter={levelFilter}
          setLogFilter={setLogFilter}
          setLevelFilter={setLevelFilter}
          threadFilter={threadFilter}
          setThreadFilter={setThreadFilter}
        />
        
        {/* 状态面板 */}
        <StatusPanel metrics={coreMetrics} getUsageRate={getUsageRate} />
        
        {/* 线程状态图 */}
        <ThreadStatus metrics={coreMetrics} threshold={3} />
        
        {/* 健康事件面板 */}
        <HealthIssuePanel 
          metrics={coreMetrics} 
          interval={interval} 
        />
        
        {/* 线程图表 */}
        <ThreadChart threadCountData={threadCountData} />
        
        {/* 任务分布图表 */}
        <TaskDistributionChart metrics={coreMetrics} getHistogramData={getHistogramData} />
        
        {/* 线程工作量图表 */}
        <ThreadWorkloadChart metrics={coreMetrics} />
      </div>
    </div>
  );
};

export default Dashboard;