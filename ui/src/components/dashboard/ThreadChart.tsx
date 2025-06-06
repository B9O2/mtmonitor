import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ThreadCountDataPoint } from '../../types';

interface ThreadChartProps {
  threadCountData: ThreadCountDataPoint[];
}

const ThreadChart: React.FC<ThreadChartProps> = ({ threadCountData }) => {
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-xl p-5 border border-slate-700/50">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        线程数量变化
      </h2>
      <div className="overflow-x-auto">
        {threadCountData.length > 0 ? (
          <LineChart width={600} height={300} data={threadCountData} className="mx-auto">
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '0.375rem' }} />
            <Legend />
            <Line type="monotone" dataKey="active" stroke="#a78bfa" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, stroke: '#c4b5fd', strokeWidth: 2 }} name="活跃线程" />
            <Line type="monotone" dataKey="total" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, stroke: '#6ee7b7', strokeWidth: 2 }} name="总线程" />
          </LineChart>
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

export default ThreadChart;