import React, { useRef, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { Metrics } from '../../types';

interface ThreadWorkloadChartProps {
  metrics: Metrics | null;
}

const ThreadWorkloadChart: React.FC<ThreadWorkloadChartProps> = ({ metrics }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleThreads, setVisibleThreads] = useState<number>(10); // 默认显示的线程数
  const [startIndex, setStartIndex] = useState<number>(0); // 起始线程索引
  
  // 自动计算可见线程数量
  useEffect(() => {
    const calculateVisibleThreads = () => {
      if (containerRef.current) {
        // 根据容器宽度计算可见线程数量，假设每个线程柱状图需要约100px宽度
        const width = containerRef.current.clientWidth;
        return Math.max(5, Math.floor(width / 100)); // 至少显示5个线程
      }
      return 10; // 默认值
    };
    
    const handleResize = () => {
      setVisibleThreads(calculateVisibleThreads());
    };
    
    // 初始计算
    handleResize();
    
    // 添加窗口调整大小监听器
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 监控线程总数，确保startIndex有效
  useEffect(() => {
    if (metrics && metrics.threads_detail.threads_count.length > 0) {
      const maxIndex = metrics.threads_detail.threads_count.length - visibleThreads;
      if (startIndex > maxIndex) {
        setStartIndex(Math.max(0, maxIndex));
      }
    }
  }, [metrics, visibleThreads, startIndex]);

  if (!metrics || !metrics.threads_detail.threads_count.length) {
    return null;
  }
  
  // 确定当前可见的线程数据
  const totalThreads = metrics.threads_detail.threads_count.length;
  const endIndex = Math.min(startIndex + visibleThreads, totalThreads);
  
  // 当前视图的数据
  const visibleData = metrics.threads_detail.threads_count
    .slice(startIndex, endIndex)
    .map((count, index) => ({
      name: `线程${startIndex + index}`,
      value: count,
      status: metrics.threads_detail.threads_status[startIndex + index]
    }));
  
  // 导航按钮处理函数
  const handleScrollLeft = () => {
    setStartIndex(Math.max(0, startIndex - Math.floor(visibleThreads / 2)));
  };
  
  const handleScrollRight = () => {
    setStartIndex(Math.min(
      totalThreads - visibleThreads, 
      startIndex + Math.floor(visibleThreads / 2)
    ));
  };
  
  // 计算是否显示导航按钮
  const showLeftButton = startIndex > 0;
  const showRightButton = endIndex < totalThreads;
  
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl p-5 border border-slate-700/50 lg:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          线程工作量分布
        </h2>
        
        {/* 显示当前视图/总数信息 */}
        <div className="text-sm text-slate-400">
          显示 {startIndex + 1}-{endIndex} / {totalThreads} 线程
        </div>
      </div>
      
      {/* 图表导航控制按钮 */}
      <div className="relative" ref={containerRef}>
        {showLeftButton && (
          <button 
            onClick={handleScrollLeft}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-slate-700/80 hover:bg-slate-600 text-white rounded-l-md p-2"
            style={{ boxShadow: '0 0 10px rgba(0,0,0,0.3)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {showRightButton && (
          <button 
            onClick={handleScrollRight}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-slate-700/80 hover:bg-slate-600 text-white rounded-r-md p-2"
            style={{ boxShadow: '0 0 10px rgba(0,0,0,0.3)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        
        {/* 响应式图表容器 */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={visibleData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '0.375rem' }}
                formatter={(value, name, props) => {
                  return [`任务数: ${value}`, `状态: ${props.payload.status === 1 ? '工作中' : '空闲'}`];
                }}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                {visibleData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.status === 1 ? '#0ea5e9' : '#475569'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ThreadWorkloadChart;