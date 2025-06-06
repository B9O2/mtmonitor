// 新文件: src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface WebSocketContextType {
  isConnected: boolean;
  message: unknown;
  sendMessage: (data: unknown) => boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // 创建单个WebSocket连接
  const wsData = useWebSocket(`ws://${window.location.hostname}:9783/ws`);

  // 使用同一个接口类型进行断言
  const { isConnected, message, sendMessage} = wsData as WebSocketContextType;

  const contextValue: WebSocketContextType = {
    isConnected,
    message,
    sendMessage,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// 便捷的hook
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};