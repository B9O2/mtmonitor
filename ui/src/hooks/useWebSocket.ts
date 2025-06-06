// 在 hooks/useWebSocket.ts 中
import { useState, useEffect, useRef } from 'react';
import { Metrics, LogEntry,WebSocketMessage} from '../types';



export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [message, setMessage] = useState<WebSocketMessage | null>(null);
  const [shouldReconnect, setShouldReconnect] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // 主要连接函数
  useEffect(() => {
    // 如果不应该重连，则直接返回
    if (!shouldReconnect) return;

    // 创建新连接
    const connect = () => {
      // 清理任何现有的连接和定时器
      cleanup();
      
      console.log(`[DEBUG] 尝试连接WebSocket: ${url} (尝试 #${reconnectAttemptsRef.current + 1})`);
      
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('[DEBUG] WebSocket连接已建立');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          
          // 设置一个ping定时器保持连接活跃
          pingIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              console.log('[DEBUG] 发送心跳包');
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000); // 每30秒发送一次
        };
        
        ws.onclose = (event) => {
          console.log(`[DEBUG] WebSocket连接已关闭: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`);
          setIsConnected(false);
          cleanup();
          
          // 只有在应该重连且连接不是主动关闭的情况下才重连
          if (shouldReconnect && event.code !== 1000) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(10000, 1000 * reconnectAttemptsRef.current);
            console.log(`[DEBUG] 将在 ${delay}ms 后尝试重新连接`);
            
            reconnectTimeoutRef.current = window.setTimeout(connect, delay);
          }
        };
        
        ws.onerror = (error) => {
          console.error('[DEBUG] WebSocket错误:', error);
        };
        
        ws.onmessage = (event: MessageEvent) => {

          try {
            const data = JSON.parse(event.data);
            
            // 如果是pong消息，直接返回
            if (data.type === 'pong') {
              console.log('[DEBUG] 收到pong心跳响应');
              return;
            }
            
            // 保存完整消息
            setMessage(data);
            
            if (data.type === 'metrics') {
              if (data.data) {
                setMetrics(data.data);
                console.log('[DEBUG] 已更新metrics数据');
              }
            } else if (data.type === 'events') {
              if (data.data && data.data.logs && Array.isArray(data.data.logs)) {
                try {
                  const parsedLogs: LogEntry[] = data.data.logs
                    .filter((jsonStr: string) => jsonStr && typeof jsonStr === 'string')
                    .map((jsonStr: string) => JSON.parse(jsonStr) as LogEntry);
                  
                  if (parsedLogs.length > 0) {
                    setLogs(prev => [...prev, ...parsedLogs].slice(-1000));
                    console.log(`[DEBUG] 已更新日志数据，新增${parsedLogs.length}条`);
                  }
                } catch (err) {
                  console.error('[DEBUG] 解析日志数据失败:', err);
                }
              }
            }
          } catch (error) {
            console.error('[DEBUG] 解析WebSocket消息时出错:', error);
          }
        };
      } catch (error) {
        console.error('[DEBUG] 创建WebSocket时出错:', error);
        
        // 创建连接失败时也尝试重连
        if (shouldReconnect) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(10000, 1000 * reconnectAttemptsRef.current);
          console.log(`[DEBUG] 创建连接失败，将在 ${delay}ms 后重试`);
          
          reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        }
      }
    };
    
    // 清理函数
    const cleanup = () => {
      // 清理定时器
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // 关闭WebSocket
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN || 
              wsRef.current.readyState === WebSocket.CONNECTING) {
            wsRef.current.close();
          }
        } catch (error) {
          console.error('[DEBUG] 关闭WebSocket时出错:', error);
        }
        wsRef.current = null;
      }
    };
    
    // 立即连接
    connect();
    
    // 组件卸载时清理
    return () => {
      console.log('[DEBUG] 组件卸载，清理WebSocket资源');
      setShouldReconnect(false); // 停止重连
      cleanup();
    };
  }, [url, shouldReconnect]);
  
  // 手动停止和启动重连的函数
  const stopReconnecting = () => setShouldReconnect(false);
  const startReconnecting = () => setShouldReconnect(true);

  return { 
    isConnected, 
    logs, 
    metrics, 
    message,
    stopReconnecting,
    startReconnecting,
    sendMessage: (data: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('[DEBUG] 发送消息:', data);
        wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
      }
      console.error('[DEBUG] 无法发送消息：WebSocket未连接');
      return false;
    }
  };
}