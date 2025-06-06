import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected, isReconnecting }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 rounded-lg">
      <div className={`w-3 h-3 rounded-full ${
        isConnected 
          ? 'bg-green-500' 
          : isReconnecting 
            ? 'bg-yellow-500 animate-pulse' 
            : 'bg-red-500'
      }`}></div>
      <span className={`text-sm ${
        isConnected 
          ? 'text-green-400' 
          : isReconnecting 
            ? 'text-yellow-400' 
            : 'text-red-400'
      }`}>
        {isConnected 
          ? 'WebSocket 已连接' 
          : isReconnecting 
            ? '正在重新连接...' 
            : 'WebSocket 未连接'}
      </span>
    </div>
  );
};

export default ConnectionStatus;