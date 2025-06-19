import React, { useState, useEffect, useRef } from 'react';
import { Metrics } from '../../types';
import ReactApexChart from 'react-apexcharts';


interface ThreadStatusProps {
  metrics: Metrics | null;
  threshold?: number; // 阻塞阈值（倍间隔）
}

const ThreadStatus: React.FC<ThreadStatusProps> = ({ metrics, threshold = 3 }) => {
  // 线程状态数据
  const [threadStats, setThreadStats] = useState({
    active: 0,     // 正常工作中的线程
    idle: 0,       // 空闲线程
    blocked: 0,    // 阻塞的线程
    total: 0       // 总线程数
  });
  
  // 悬停状态
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  
  // 当指标数据变化时更新线程状态统计
  useEffect(() => {
    if (!metrics || !metrics.threads_detail) {
      setThreadStats({ active: 0, idle: 0, blocked: 0, total: 0 });
      return;
    }
    
    const threadStatuses = metrics.threads_detail.threads_status;
    const total = threadStatuses.length;
    
    // 从健康问题中收集阻塞的线程ID
    const blockedThreadIds = new Set<number>();
    
    if (metrics.health_issues && metrics.health_issues.length > 0) {
      metrics.health_issues.forEach(issue => {
        // 检查是否是线程类型的问题且有特定线程ID
        if (
          issue.type === 'thread-blocking' && 
          issue.thread_id >= 0 && 
          threadStatuses[issue.thread_id] === 1 // 确保线程当前是工作状态
        ) {
          blockedThreadIds.add(issue.thread_id);
        }
      });
    }
    
    // 计算各状态线程数
    const blocked = blockedThreadIds.size;
    let working = 0;
    
    for (let i = 0; i < threadStatuses.length; i++) {
      if (threadStatuses[i] === 1) {
        working++;
      }
    }
    
    // 计算正常工作的线程数（工作中但不阻塞）
    const active = working - blocked;
    // 计算空闲线程数
    const idle = total - working;
    
    setThreadStats({
      active,
      idle,
      blocked,
      total
    });
    
    console.log('[DEBUG] 线程状态更新:', { active, idle, blocked, total });
  }, [metrics]);
  
  // 计算展示数据
  const { active, idle, blocked, total } = threadStats;
  
  // 所有可能的状态（不过滤）
  const allChartData = [
    { id: 'active', value: active, label: '工作中', color: '#0ea5e9', percentage: total > 0 ? Math.round((active / total) * 100) : 0 },
    { id: 'idle', value: idle, label: '空闲', color: '#22c55e', percentage: total > 0 ? Math.round((idle / total) * 100) : 0 },
    { id: 'blocked', value: blocked, label: '阻塞', color: '#ef4444', percentage: total > 0 ? Math.round((blocked / total) * 100) : 0 }
  ];

  // 只包含有值的数据（用于图例）
  const chartData = allChartData.filter(item => item.value > 0);

  // 引入依赖
  const prevDataRef = useRef({ active: -1, idle: -1, blocked: -1, total: -1 });
  const forceUpdateRef = useRef(0);

  // 检测数据变化，只在数据变化时更新 key
  useEffect(() => {
    const prevData = prevDataRef.current;
    
    // 检查数据是否真的变化了
    if (
      prevData.active !== active || 
      prevData.idle !== idle || 
      prevData.blocked !== blocked || 
      prevData.total !== total
    ) {
      // 数据变化，更新引用并增加强制更新计数
      prevDataRef.current = { active, idle, blocked, total };
      forceUpdateRef.current += 1;
      
      console.log('[DEBUG] 线程数据变化，将重新渲染图表');
    }
  }, [active, idle, blocked, total]);

  // 使用不包含时间戳的 key，只在数据变化时更新
  const chartKey = `thread-chart-${active}-${idle}-${blocked}-${total}-${forceUpdateRef.current}`;
  
  // ApexCharts 配置
  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
      animations: {
        enabled: true,
        speed: 500,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      events: {
        mounted: function() {
          console.log('[DEBUG] 图表已挂载，添加事件监听器');
          
          // 添加自定义 CSS 到文档
          const styleElement = document.createElement('style');
          styleElement.textContent = `
            .apexcharts-pie-series path {
              transition: transform 0.3s ease;
              transform-origin: center;
            }
            .apexcharts-pie-series path.hovered {
              transform: scale(1.05) translateY(-5px);
              filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
            }
          `;
          document.head.appendChild(styleElement);
          
          // 在组件卸载时移除样式
          return function() {
            document.head.removeChild(styleElement);
          };
        },
        mouseMove: function( config) {
          if (!config.dataPointIndex && config.dataPointIndex !== 0) return;
          
          try {
            console.log('[DEBUG] 鼠标移动到数据点:', config.dataPointIndex);
            
            // 清除所有当前的悬浮状态
            const allPaths = document.querySelectorAll('.apexcharts-pie-series path');
            allPaths.forEach(path => path.classList.remove('hovered'));
            
            // 查找当前悬浮的路径并添加悬浮类
            const seriesIndex = config.seriesIndex !== undefined ? config.seriesIndex : 0;
            const selector = `.apexcharts-pie-series[data-index="${seriesIndex}"] path[data-i="${config.dataPointIndex}"]`;
            
            console.log('[DEBUG] 查找元素:', selector);
            const hoveredPath = document.querySelector(selector);
            
            if (hoveredPath) {
              console.log('[DEBUG] 找到悬浮元素，添加效果');
              hoveredPath.classList.add('hovered');
              
              // 设置状态来同步右侧图例
              if (config.dataPointIndex < chartData.length) {
                setHoveredSegment(chartData[config.dataPointIndex].id);
              }
            } else {
              console.log('[DEBUG] 未找到悬浮元素');
            }
          } catch (error) {
            console.error('[DEBUG] 处理悬浮效果时出错:', error);
          }
        },
        mouseLeave: function() {
          console.log('[DEBUG] 鼠标离开图表');
          
          // 移除所有悬浮效果
          const allPaths = document.querySelectorAll('.apexcharts-pie-series path');
          allPaths.forEach(path => path.classList.remove('hovered'));
          
          setHoveredSegment(null);
        }
      },
      redrawOnParentResize: false,
      redrawOnWindowResize: false
    },
    labels: chartData.map(item => item.label),
    colors: chartData.map(item => item.color),
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      pie: {
        expandOnClick: false, // 禁用点击扩展
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              show: false
            },
            value: {
              show: true,
              fontSize: '22px',
              fontWeight: 600,
              color: '#f8fafc',
              offsetY: -10,
              formatter: function() {
                return total.toString();
              }
            },
            total: {
              show: true,
              showAlways: true, // 确保总是显示
              label: '总线程',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 400,
              formatter: function() {
                return total.toString();
              }
            }
          }
        }
      }
    },
    stroke: {
      width: 3, // 增加描边宽度，使放大效果更明显
      colors: ['#1e293b'] // 与背景接近的颜色
    },
    tooltip: {
      enabled: true,
      custom: function({  dataPointIndex }) {
        if (dataPointIndex < 0 || dataPointIndex >= chartData.length) return '';
        
        const item = chartData[dataPointIndex];
        return `
          <div class="bg-slate-800 px-3 py-2 rounded shadow-lg text-white">
            <div class="font-medium">${item.label}</div>
            <div class="flex justify-between gap-4 mt-1">
              <span class="text-slate-300">数量:</span>
              <span class="font-medium">${item.value}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-slate-300">占比:</span>
              <span class="font-medium">${item.percentage}%</span>
            </div>
            ${item.id === 'blocked' ? 
              `<div class="text-xs text-orange-300 mt-1">工作时间 ≥ ${threshold} 倍间隔</div>` : ''}
          </div>
        `;
      }
    },
    legend: {
      show: false
    },
    states: {
      hover: {
        filter: {
          type: 'none' // 禁用默认悬浮效果
        }
      },
      active: {
        filter: {
          type: 'none' // 禁用默认选中效果
        }
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 280
        }
      }
    }],
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl p-5 border border-slate-700/50">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        线程状态分布
      </h2>
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* 圆环图 */}
        <div className="w-full md:w-auto">
          <div className="mx-auto" style={{ width: '240px', height: '240px' }}>
            {total > 0 ? (
              <ReactApexChart 
                key={chartKey}
                options={{
                  ...chartOptions,
                  // 确保每次更新时都刷新标签和颜色
                  labels: chartData.map(item => item.label),
                  colors: chartData.map(item => item.color),
                  // 直接在组件中设置 plotOptions，确保 label 正确显示
                  plotOptions: {
                    pie: {
                      expandOnClick: false,
                      donut: {
                        size: '75%',
                        labels: {
                          show: true,
                          name: {
                            show: false
                          },
                          value: {
                            show: true,
                            fontSize: '22px',
                            fontWeight: 600,
                            color: '#f8fafc',
                            offsetY: -10,
                            formatter: function() {
                              return total.toString();
                            }
                          },
                          total: {
                            show: true,
                            showAlways: true, // 确保总是显示
                            label: '总线程',
                            color: '#94a3b8',
                            fontSize: '14px',
                            fontWeight: 400,
                            formatter: function() {
                              return total.toString();
                            }
                          }
                        }
                      }
                    }
                  }
                }} 
                series={chartData.map(item => item.value)} 
                type="donut" 
                height={240} 
              />
            ) : (
              <div className="flex justify-center items-center h-full text-slate-400">
                <svg className="animate-pulse w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                等待数据...
              </div>
            )}
          </div>
        </div>
        
        {/* 图例 */}
        <div className="space-y-4 mt-4 md:mt-0 w-full md:w-64">
          {/* 工作中 */}
          <div 
            className="flex items-center p-2 rounded transition-colors duration-200"
            style={{ 
              backgroundColor: hoveredSegment === 'active' ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
              opacity: hoveredSegment && hoveredSegment !== 'active' ? 0.6 : 1
            }}
            onMouseEnter={() => active > 0 && setHoveredSegment('active')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-4 h-4 rounded-full bg-[#0ea5e9] mr-3"></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-slate-300">工作中</span>
                <span className="font-semibold">{active}</span>
              </div>
              <div className="text-xs text-slate-400">
                {total > 0 ? Math.round((active / total) * 100) : 0}%
              </div>
            </div>
          </div>
          
          {/* 空闲 */}
          <div 
            className="flex items-center p-2 rounded transition-colors duration-200"
            style={{ 
              backgroundColor: hoveredSegment === 'idle' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
              opacity: hoveredSegment && hoveredSegment !== 'idle' ? 0.6 : 1
            }}
            onMouseEnter={() => idle > 0 && setHoveredSegment('idle')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-4 h-4 rounded-full bg-[#22c55e] mr-3"></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-slate-300">空闲</span>
                <span className="font-semibold">{idle}</span>
              </div>
              <div className="text-xs text-slate-400">
                {total > 0 ? Math.round((idle / total) * 100) : 0}%
              </div>
            </div>
          </div>
          
          {/* 阻塞 */}
          <div 
            className="flex items-center p-2 rounded transition-colors duration-200"
            style={{ 
              backgroundColor: hoveredSegment === 'blocked' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              opacity: hoveredSegment && hoveredSegment !== 'blocked' ? 0.6 : 1
            }}
            onMouseEnter={() => blocked > 0 && setHoveredSegment('blocked')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-4 h-4 rounded-full bg-[#ef4444] mr-3"></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-slate-300">阻塞</span>
                <span className="font-semibold">{blocked}</span>
              </div>
              <div className="text-xs text-slate-400">
                {total > 0 ? Math.round((blocked / total) * 100) : 0}%
              </div>
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