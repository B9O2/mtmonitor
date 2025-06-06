import React from 'react';
import { Metrics } from '../../types';

interface StatusPanelProps {
  metrics: Metrics | null;
  getUsageRate: () => string;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ metrics, getUsageRate }) => {
  if (!metrics) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl p-5 border border-slate-700/50">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          系统状态
        </h2>
        <div className="h-[10rem] flex justify-center items-center text-slate-400">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl p-5 border border-slate-700/50">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        系统状态
      </h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
          <span className="text-slate-300 flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            活跃线程:
          </span> 
          <span className="font-semibold text-blue-400">{metrics.working}</span>
        </div>
        <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
          <span className="text-slate-300">总线程数:</span> 
          <span className="font-semibold text-indigo-400">{metrics.threads_detail.threads_status.length}</span>
        </div>
        <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
          <span className="text-slate-300">空闲线程:</span> 
          <span className="font-semibold text-emerald-400">{metrics.idle}</span>
        </div>
        <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
          <span className="text-slate-300">已完成任务:</span> 
          <span className="font-semibold text-green-400">{metrics.total_result}</span>
        </div>
        <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
          <span className="text-slate-300">总任务:</span> 
          <span className="font-semibold text-violet-400">{metrics.total_task}</span>
        </div>
        {metrics.total_retry !== undefined && (
          <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
            <span className="text-slate-300">重试任务:</span> 
            <span className="font-semibold text-rose-400">{metrics.total_retry}</span>
          </div>
        )}
        {metrics.retry_size !== undefined && (
          <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
            <span className="text-slate-300">重试队列大小:</span> 
            <span className="font-semibold text-pink-400">{metrics.retry_size}</span>
          </div>
        )}
        <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
          <span className="text-slate-300">处理速度:</span> 
          <span className="font-semibold text-sky-400">{metrics.speed.toFixed(2)}/s</span>
        </div>
        <div className="bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/40 transition-colors duration-200">
          <span className="text-slate-300">线程使用率:</span> 
          <span className="font-semibold text-teal-400">{getUsageRate()}%</span>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;