import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <div className={`
      px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-300
      ${isConnected ? 'bg-emerald-500/90 text-emerald-950' : 'bg-rose-500/90 text-rose-950'}
      ${isConnected ? 'animate-breath' : ''} 
    `}>
      {isConnected ? '已连接' : '未连接'}
    </div>
  );
};

export default ConnectionStatus;