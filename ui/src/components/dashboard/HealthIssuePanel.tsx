import React, { useMemo } from 'react';
import { CoreMetricsWithStatus } from '../../contexts/AppDataContext';

interface HealthIssuePanelProps {
  metrics: CoreMetricsWithStatus | null;
  interval: string; // 间隔时间字符串，如"1s"
}

// 聚合后的健康问题类型
interface AggregatedHealthIssue {
  title: string;
  descriptions: string[];
  alert: boolean;
  threadIds: number[];
  count: number;
  type: string; // 添加类型字段
}

const HealthIssuePanel: React.FC<HealthIssuePanelProps> = ({ metrics }) => {
  // 聚合健康问题
  const aggregatedHealthIssues = useMemo<AggregatedHealthIssue[]>(() => {
    if (!metrics || !metrics.health_issues || metrics.health_issues.length === 0) {
      return [];
    }
    
    // 按标题分组
    const issueGroups: Record<string, AggregatedHealthIssue> = {};
    
    metrics.health_issues.forEach(issue => {
      if (!issueGroups[issue.title]) {
        issueGroups[issue.title] = {
          title: issue.title,
          descriptions: [issue.description],
          alert: issue.alert,
          threadIds: issue.thread_id >= 0 ? [issue.thread_id] : [],
          count: 1,
          type: issue.type || '未分类' // 添加类型，如果不存在则设为默认值
        };
      } else {
        const group = issueGroups[issue.title];
        // 只添加不重复的描述
        if (!group.descriptions.includes(issue.description)) {
          group.descriptions.push(issue.description);
        }
        // 添加线程ID（如果有效且不重复）
        if (issue.thread_id >= 0 && !group.threadIds.includes(issue.thread_id)) {
          group.threadIds.push(issue.thread_id);
        }
        group.count++;
      }
    });
    
    // 将分组转换为数组并排序（严重警报优先）
    return Object.values(issueGroups).sort((a, b) => {
      // 首先按警报状态排序
      if (a.alert !== b.alert) {
        return a.alert ? -1 : 1;
      }
      // 然后按受影响线程数量排序
      if (a.threadIds.length !== b.threadIds.length) {
        return b.threadIds.length - a.threadIds.length;
      }
      // 最后按出现次数排序
      return b.count - a.count;
    });
  }, [metrics]);
  
  // 获取类型标签的颜色
  const getTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'performance':
        return 'bg-purple-700';
      case 'warning':
        return 'bg-amber-600';
      case 'error':
        return 'bg-red-600';
      case 'thread':
        return 'bg-blue-600';
      case 'system':
        return 'bg-teal-600';
      default:
        return 'bg-gray-600';
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
      </div>
      
      <div className="p-4 max-h-[350px] overflow-y-auto">
        {aggregatedHealthIssues.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            {metrics ? '暂无健康事件' : '等待数据中...'}
          </div>
        ) : (
          <div className="space-y-3">
            {aggregatedHealthIssues.map((issue, index) => (
              <div 
                key={`${issue.title}-${index}`}
                className={`p-3 rounded-lg border ${
                  issue.alert 
                    ? 'bg-red-900/30 border-red-700' 
                    : 'bg-yellow-900/30 border-yellow-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium flex items-center flex-wrap gap-2">
                    {issue.title}
                    
                    {/* 类型标签 */}
                    {issue.type && (
                      <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(issue.type)}`}>
                        {issue.type}
                      </span>
                    )}
                    
                    {/* 计数标签 */}
                    {issue.count > 1 && (
                      <span className="px-1.5 py-0.5 bg-slate-700 rounded-full text-xs">
                        {issue.count}
                      </span>
                    )}
                  </div>
                  <div className={`px-2 py-0.5 rounded text-sm ${
                    issue.alert ? 'bg-red-700' : 'bg-yellow-700'
                  }`}>
                    {issue.alert ? '严重' : '警告'}
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-slate-300">
                  {issue.descriptions.map((desc, i) => (
                    <p key={i} className="mb-1">{desc}</p>
                  ))}
                </div>
                
                {issue.threadIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {issue.threadIds.length <= 10 ? (
                      issue.threadIds.map(id => (
                        <span key={id} className="inline-block px-2 py-0.5 bg-slate-700 rounded-md text-xs">
                          线程 #{id}
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="inline-block px-2 py-0.5 bg-slate-700 rounded-md text-xs">
                          {issue.threadIds.length} 个线程受影响
                        </span>
                        <button 
                          className="text-blue-400 text-xs hover:underline"
                          onClick={() => alert(`受影响的线程ID: ${issue.threadIds.join(', ')}`)}
                        >
                          查看详情
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthIssuePanel;