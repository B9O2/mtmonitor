import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { HistogramDataPoint, Metrics } from '../../types';

interface TaskDistributionChartProps {
  metrics: Metrics | null;
  getHistogramData: () => HistogramDataPoint[];
}

const TaskDistributionChart: React.FC<TaskDistributionChartProps> = ({ metrics, getHistogramData }) => {
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl p-5 border border-slate-700/50">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        任务分布
      </h2>
      <div className="overflow-x-auto">
        {metrics ? (
          <BarChart width={600} height={300} data={getHistogramData()} className="mx-auto">
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '0.375rem' }} />
            <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <div className="h-[18rem] flex justify-center items-center text-slate-400">
            <svg className="animate-pulse w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            等待数据...
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDistributionChart;