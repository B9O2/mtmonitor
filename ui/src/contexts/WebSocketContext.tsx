// 新文件: src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import WebSocketManager from '../utils/WebSocketManager';
import { WebSocketMessage } from '../types';

// WebSocket上下文类型
interface WebSocketContextType {
  isConnected: boolean;
  isReconnecting: boolean;
  message: WebSocketMessage | null;
  reconnectAttempts: number;
  sendMessage: (data: unknown) => boolean;
  stopReconnecting: () => void;
  startReconnecting: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  pingInterval?: number; // 心跳间隔，默认30秒
  maxReconnectAttempts?: number; // 最大重连次数，默认无限
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  pingInterval = 30000,
  maxReconnectAttempts = Infinity
}) => {
  // 获取全局WebSocket管理器实例
  const wsManager = WebSocketManager.getInstance();
  
  // 连接状态
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [message, setMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // 配置WebSocket管理器
  useEffect(() => {
    wsManager.configure({ 
      pingInterval, 
      maxReconnectAttempts 
    });
  }, [pingInterval, maxReconnectAttempts]);
  
  // 订阅WebSocket消息
  useEffect(() => {
    console.log('[DEBUG] WebSocketProvider 挂载，订阅WebSocket消息');
    
    // 订阅消息
    const unsubscribeMessage = wsManager.subscribe((data) => {
      setMessage(data);
    });
    
    // 订阅连接状态
    const unsubscribeStatus = wsManager.subscribeToConnectionStatus((status) => {
      setIsConnected(status.isConnected);
      setIsReconnecting(status.isReconnecting);
      setReconnectAttempts(wsManager.getConnectionStatus().reconnectAttempts);
    });
    
    // 确保WebSocket连接
    wsManager.connect();
    
    // 清理订阅
    return () => {
      console.log('[DEBUG] WebSocketProvider 卸载，取消订阅');
      unsubscribeMessage();
      unsubscribeStatus();
      // 注意：不在这里关闭WebSocket连接
    };
  }, []);
  
  // 发送消息
  const sendMessage = useCallback((data: unknown): boolean => {
    return wsManager.sendMessage(data);
  }, []);
  
  // 手动停止和启动重连的函数
  const stopReconnecting = useCallback(() => {
    wsManager.stopReconnecting();
  }, []);
  
  const startReconnecting = useCallback(() => {
    wsManager.startReconnecting();
  }, []);
  
  // 提供上下文值
  const contextValue: WebSocketContextType = {
    isConnected,
    isReconnecting,
    message,
    reconnectAttempts,
    sendMessage,
    stopReconnecting,
    startReconnecting
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// 使用WebSocket上下文的Hook
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};