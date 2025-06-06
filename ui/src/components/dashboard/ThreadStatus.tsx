import React, { useState, useEffect } from 'react';
import { Metrics } from '../../types';
import { ParseIntervalToMs } from '../../utils/time';

interface ThreadStatusProps {
  metrics: Metrics | null;
  threshold?: number; // 阻塞阈值（倍间隔）
}

const ThreadStatus: React.FC<ThreadStatusProps> = ({ metrics, threshold = 3 }) => {
  // 圆环的基本配置
  const size = 240; // 总尺寸
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) * 0.8; // 80%的尺寸作为半径
  const strokeWidth = radius * 0.3; // 弧的宽度

  // 初始状态
  const [activeThreads, setActiveThreads] = useState(0);
  const [idleThreads, setIdleThreads] = useState(0);
  const [blockedThreads, setBlockedThreads] = useState(0);
  const [totalThreads, setTotalThreads] = useState(0);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // 当指标数据变化时计算线程状态
  useEffect(() => {
    if (!metrics || !metrics.threads_detail) return;

    // 获取所有线程状态和工作时间
    const total = metrics.threads_detail.threads_status.length;
    
    // 计算各状态线程数
    let active = 0;
    let blocked = 0;
    
    metrics.threads_detail.threads_status.forEach((status, index) => {
      const workingTime = metrics.threads_working_times?.[index] || 0;
      
      if (status === 1) { // 线程工作中
        if (workingTime >= threshold) {
          blocked++; // 工作时间超过阈值，可能阻塞
        } else {
          active++; // 正常工作中
        }
      }
    });
    
    const idle = total - active - blocked;
    
    setActiveThreads(active);
    setIdleThreads(idle);
    setBlockedThreads(blocked);
    setTotalThreads(total);
  }, [metrics, threshold]);

  // 计算圆环各部分的角度
  const calculateAngles = () => {
    if (totalThreads === 0) return { active: 0, idle: 0, blocked: 0 };
    
    // 计算每种状态的角度
    const activeAngle = (activeThreads / totalThreads) * 360;
    const idleAngle = (idleThreads / totalThreads) * 360;
    const blockedAngle = (blockedThreads / totalThreads) * 360;
    
    return { active: activeAngle, idle: idleAngle, blocked: blockedAngle };
  };

  // 计算SVG路径
  const createArc = (startAngle: number, endAngle: number) => {
    // 将角度转换为弧度
    const start = (startAngle - 90) * (Math.PI / 180);
    const end = (endAngle - 90) * (Math.PI / 180);
    
    // 计算弧的端点
    const startX = centerX + radius * Math.cos(start);
    const startY = centerY + radius * Math.sin(start);
    const endX = centerX + radius * Math.cos(end);
    const endY = centerY + radius * Math.sin(end);
    
    // 确定是大弧还是小弧
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    
    // 创建SVG路径
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  const angles = calculateAngles();
  
  // 计算各段的起始角度
  const startAngles = {
    active: 0,
    idle: angles.active,
    blocked: angles.active + angles.idle
  };
  
  const endAngles = {
    active: angles.active,
    idle: angles.active + angles.idle,
    blocked: 360
  };

  // 计算百分比
  const percentages = {
    active: totalThreads > 0 ? ((activeThreads / totalThreads) * 100).toFixed(1) : '0',
    idle: totalThreads > 0 ? ((idleThreads / totalThreads) * 100).toFixed(1) : '0',
    blocked: totalThreads > 0 ? ((blockedThreads / totalThreads) * 100).toFixed(1) : '0'
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl p-5 border border-slate-700/50">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        线程状态分布
      </h2>
      
      <div className="flex flex-col md:flex-row items-center justify-between">
        {/* SVG圆环图 */}
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* 背景圆环 - 淡灰色 */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="#334155"
              strokeWidth={strokeWidth}
            />
            
            {/* 活跃线程弧 - 蓝色 */}
            {angles.active > 0 && (
              <path
                d={createArc(startAngles.active, endAngles.active)}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                className={`transition-opacity duration-300 ${hoveredSection && hoveredSection !== 'active' ? 'opacity-50' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredSection('active')}
                onMouseLeave={() => setHoveredSection(null)}
              />
            )}
            
            {/* 空闲线程弧 - 绿色 */}
            {angles.idle > 0 && (
              <path
                d={createArc(startAngles.idle, endAngles.idle)}
                fill="none"
                stroke="#22c55e"
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                className={`transition-opacity duration-300 ${hoveredSection && hoveredSection !== 'idle' ? 'opacity-50' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredSection('idle')}
                onMouseLeave={() => setHoveredSection(null)}
              />
            )}
            
            {/* 阻塞线程弧 - 红色 */}
            {angles.blocked > 0 && (
              <path
                d={createArc(startAngles.blocked, endAngles.blocked)}
                fill="none"
                stroke="#ef4444"
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                className={`transition-opacity duration-300 ${hoveredSection && hoveredSection !== 'blocked' ? 'opacity-50' : 'opacity-100'}`}
                onMouseEnter={() => setHoveredSection('blocked')}
                onMouseLeave={() => setHoveredSection(null)}
              />
            )}
            
            {/* 中央文字 */}
            <text
              x={centerX}
              y={centerY - 10}
              textAnchor="middle"
              fontSize="18"
              fontWeight="bold"
              fill="#f8fafc"
            >
              {totalThreads}
            </text>
            <text
              x={centerX}
              y={centerY + 15}
              textAnchor="middle"
              fontSize="14"
              fill="#94a3b8"
            >
              总线程
            </text>
          </svg>
          
          {/* 悬停提示 */}
          {hoveredSection && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-700/90 p-2 rounded shadow-lg text-white text-sm whitespace-nowrap">
              {hoveredSection === 'active' && `工作中: ${activeThreads} (${percentages.active}%)`}
              {hoveredSection === 'idle' && `空闲中: ${idleThreads} (${percentages.idle}%)`}
              {hoveredSection === 'blocked' && `疑似阻塞: ${blockedThreads} (${percentages.blocked}%)`}
            </div>
          )}
        </div>
        
        {/* 图例说明 */}
        <div className="space-y-4 mt-4 md:mt-0">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-[#0ea5e9] mr-3"></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-slate-300">工作中</span>
                <span className="font-semibold">{activeThreads}</span>
              </div>
              <div className="text-xs text-slate-400">{percentages.active}%</div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-[#22c55e] mr-3"></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-slate-300">空闲</span>
                <span className="font-semibold">{idleThreads}</span>
              </div>
              <div className="text-xs text-slate-400">{percentages.idle}%</div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-[#ef4444] mr-3"></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-slate-300">疑似阻塞</span>
                <span className="font-semibold">{blockedThreads}</span>
              </div>
              <div className="text-xs text-slate-400">{percentages.blocked}%</div>
              <div className="text-xs text-slate-500 mt-1">
                工作时间 ≥ {threshold} 倍间隔
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreadStatus;