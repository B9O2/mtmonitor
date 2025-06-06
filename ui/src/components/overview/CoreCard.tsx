import React from 'react';
import { Link } from 'react-router-dom';
import { Core, CoreMetricsWithStatus } from '../../contexts/AppDataContext';

interface CoreCardProps {
  core: Core;
  metrics?: CoreMetricsWithStatus | null;
  onDelete: (name: string) => void;
}

const CoreCard: React.FC<CoreCardProps> = ({ core, metrics, onDelete }) => {
  // 计算线程使用率
  const getUsageRate = (): string => {
    if (!metrics || metrics.threads_detail.threads_status.length === 0) return "0.00";
    const rate = (metrics.working / metrics.threads_detail.threads_status.length) * 100;
    return rate.toFixed(2);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden hover:border-blue-500 transition-all">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-blue-400">{core.name}</h3>
          <div className="flex space-x-2">
            {/* 只保留删除按钮 */}
            <button 
              onClick={() => onDelete(core.name)}
              className="text-red-400 hover:text-red-500"
              title="删除核心"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 核心连接信息 */}
        <div className="text-sm text-slate-300 mb-3 flex items-center justify-between">
          <div className="font-mono">{core.host}:{core.port}</div>
          <div className="text-xs text-slate-400">{core.interval}</div>
        </div>
        
        {/* 连接状态显示 */}
        <div className="flex items-center mb-4">
          <div className={`w-3 h-3 rounded-full mr-2 ${metrics?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm ${metrics?.connected ? 'text-green-400' : 'text-red-400'}`}>
            {metrics?.connected ? '已连接' : '未连接'}
          </span>
        </div>
        
        {/* 核心状态信息 */}
        {metrics ? (
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">线程</span>
              <span className="font-semibold">{metrics.threads_detail.threads_status.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">工作中</span>
              <span className="font-semibold">{metrics.working}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">使用率</span>
              <span className="font-semibold">{getUsageRate()}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">完成</span>
              <span className="font-semibold">{metrics.total_result}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">重试</span>
              <span className="font-semibold">{metrics.total_retry || 0}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-slate-400 mb-4">
            等待数据中...
          </div>
        )}
        
        {/* 查看详情按钮 */}
        <Link 
          to={`/dashboard/${core.name}`} 
          className="inline-block w-full text-center py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-md transition-colors"
        >
          查看详情
        </Link>
      </div>
    </div>
  );
};

export default CoreCard;