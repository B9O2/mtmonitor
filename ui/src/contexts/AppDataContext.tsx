import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useWebSocketContext } from './WebSocketContext';
import { Metrics, LogEntry, LogLevel } from '../types';


// 核心类型定义
export interface Core {
  name: string;
  host: string;
  port: number;
  interval: string;
}

// WebSocket消息接口定义
interface WebSocketMetricsMessage {
  data: Metrics;
  name: string;
  type: 'metrics';
}

interface WebSocketEventsMessage {
  data: {
    logs: string[];
  };
  name: string;
  type: 'events';
}

export type WebSocketMessage = WebSocketMetricsMessage | WebSocketEventsMessage;

// 扩展Metrics类型增加连接状态
export type CoreMetricsWithStatus = Metrics & { connected: boolean };

// 应用数据上下文类型
interface AppDataContextType {
  // 核心列表及状态
  cores: Core[];
  loading: boolean;
  error: string | null;
  
  // 核心指标数据
  coreMetrics: Record<string, CoreMetricsWithStatus | null>;
  
  // 日志数据 - 按核心名称分组
  coreLogs: Record<string, LogEntry[]>;
  
  // 核心选择状态
  selectedCore: string | null;
  setSelectedCore: (name: string | null) => void;
  
  // 获取特定核心的指标
  getMetricsForCore: (name: string) => CoreMetricsWithStatus | null;
  
  // 获取特定核心的日志
  getLogsForCore: (name: string) => LogEntry[];
  
  // 刷新数据
  refreshCores: () => Promise<void>;
  
  // 删除核心
  deleteCore: (name: string) => Promise<boolean>;
  
  // 添加核心
  addCore: (core: Omit<Core, 'name'> & { name: string, credential_name: string }) => Promise<boolean>;

  // 获取特定核心的间隔
  getCoreInterval: (name: string) => string;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export const AppDataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // 从WebSocket上下文获取基础连接状态和消息
  const { isConnected, message } = useWebSocketContext();
  
  // 核心数据状态
  const [cores, setCores] = useState<Core[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 核心指标和日志
  const [coreMetrics, setCoreMetrics] = useState<Record<string, CoreMetricsWithStatus | null>>({});
    const [coreLogs, setCoreLogs] = useState<Record<string, LogEntry[]>>({});
  
  // 跟踪每个核心最后一次更新的时间
  const lastUpdateTimeRef = useRef<Record<string, number>>({});
  
  // 当前选中的核心
  const [selectedCore, setSelectedCore] = useState<string | null>(null);
  
  // 获取所有核心
  const fetchCores = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cores?_t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch cores');
      
      const data = await response.json();
      setCores(data);
      setError(null);
      
      // 初始化指标存储
      const initialMetrics: Record<string, CoreMetricsWithStatus | null> = {};
      data.forEach((core: Core) => {
        initialMetrics[core.name] = coreMetrics[core.name] || null;
      });
      
      setCoreMetrics(prev => ({
        ...initialMetrics,
        ...prev
      }));
      
      return data;
    } catch (err) {
      console.error('获取Cores失败:', err);
      setError('无法获取Cores列表，请检查服务器连接');
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // 删除核心
  const deleteCore = async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/cores/${name}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete core');
      
      // 立即从本地状态中移除
      setCores(prevCores => prevCores.filter(core => core.name !== name));
      
      // 同时清除对应的metrics数据
      setCoreMetrics(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
      
      // 清除日志数据
      setCoreLogs(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
      
      // 如果当前选中的核心被删除，清除选择
      if (selectedCore === name) {
        setSelectedCore(null);
      }
      
      // 延迟后重新获取列表，确保与服务器同步
      setTimeout(() => {
        fetchCores();
      }, 500);
      
      return true;
    } catch (err) {
      console.error('删除核心失败:', err);
      return false;
    }
  };
  
  // 添加核心
  const addCore = async (coreData: Omit<Core, 'name'> & { name: string, credential_name: string }): Promise<boolean> => {
    try {
      const response = await fetch('/api/cores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(coreData)
      });
      
      if (!response.ok) throw new Error('Failed to add core');
      
      // 重新获取核心列表
      await fetchCores();
      return true;
    } catch (err) {
      console.error('添加核心失败:', err);
      return false;
    }
  };
  
// 处理WebSocket消息
useEffect(() => {
  if (!message) return;
  
  try {
    const wsMessage = message as WebSocketMessage;
    const coreName = wsMessage.name;
    
    if (wsMessage.type === 'metrics') {
      // 更新metrics和连接状态
      const metricsData = wsMessage.data;
      
      setCoreMetrics(prev => ({
        ...prev,
        [coreName]: {
          ...metricsData,
          connected: true
        }
      }));
      
      // 记录最后更新时间
      lastUpdateTimeRef.current[coreName] = Date.now();
    } 
    else if (wsMessage.type === 'events' && wsMessage.data?.logs) {
      // 处理日志消息
      try {
        const parsedLogs: LogEntry[] = wsMessage.data.logs
          .filter(log => typeof log === 'string')
          .map(log => {
            try {
              const parsed = JSON.parse(log);
              // 基本验证，确保对象有必要的字段
              if (
                typeof parsed === 'object' && 
                parsed !== null && 
                'timestamp' in parsed && 
                'level' in parsed && 
                'message' in parsed
              ) {
                return parsed as LogEntry;
              }
              console.warn('Invalid log entry format:', parsed);
              // 返回一个有效的默认日志条目
              return {
                timestamp: new Date().toISOString(),
                level: LogLevel.WARN,
                message: 'Invalid log format',
                context: { original: log }
              } as LogEntry;
            } catch (parseError) {
              console.error('JSON解析失败:', parseError);
              return {
                timestamp: new Date().toISOString(),
                level: LogLevel.ERROR,
                message: 'Log parsing failed',
                context: { original: log }
              } as LogEntry;
            }
          });
        
        if (parsedLogs.length > 0) {
          setCoreLogs(prev => {
            const currentLogs = prev[coreName] || [];
            const updatedLogs = [...currentLogs, ...parsedLogs].slice(-1000); // 保留最新1000条
            
            return {
              ...prev,
              [coreName]: updatedLogs
            };
          });
        }
      } catch (err) {
        console.error('解析日志失败:', err);
      }
    }
  } catch (err) {
    console.error('处理WebSocket消息失败:', err);
  }
}, [message]);
  
  // 检测连接断开的核心
  useEffect(() => {
    if (!isConnected) {
      // 如果WebSocket断开，将所有核心标记为断开连接
      setCoreMetrics(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(name => {
          if (updated[name]) {
            updated[name] = { ...updated[name], connected: false };
          }
        });
        return updated;
      });
      return;
    }
    
    // 每5秒检查一次未更新的核心
    const checkConnectionInterval = setInterval(() => {
      const now = Date.now();
      
      setCoreMetrics(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        cores.forEach(core => {
          const name = core.name;
          if (updated[name]?.connected) {
            const lastUpdate = lastUpdateTimeRef.current[name] || 0;
            
            // 使用核心的interval值计算超时
            const intervalMs = parseIntervalToMs(core.interval);
            const staleTimeout = intervalMs * 3; // 3倍间隔视为超时
            
            if (now - lastUpdate > staleTimeout) {
              updated[name] = { ...updated[name], connected: false };
              hasChanges = true;
            }
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 5000);
    
    return () => clearInterval(checkConnectionInterval);
  }, [isConnected, cores]);
  
  // 组件加载时获取数据
  useEffect(() => {
    fetchCores();
  }, []);
  
  // 工具函数：解析间隔字符串为毫秒
const parseIntervalToMs = (interval: string): number => {
  const match = interval.match(/^(\d+)(\w+)$/);
  if (!match) return 1000; // 默认1秒
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'ms': return value;
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return value * 1000;
  }
};
  
  // 获取特定核心的指标
  const getMetricsForCore = (name: string): CoreMetricsWithStatus | null => {
    return coreMetrics[name] || null;
  };

    // 获取特定核心的日志
    const getLogsForCore = (name: string): LogEntry[] => {
    return coreLogs[name] || [];
    };
    
  // 获取特定核心的间隔
  const getCoreInterval = (name: string): string => {
    const core = cores.find(c => c.name === name);
    return core?.interval || '1s';
  };
  
  const contextValue: AppDataContextType = {
    cores,
    loading,
    error,
    coreMetrics,
    coreLogs,
    selectedCore,
    setSelectedCore,
    getMetricsForCore,
    getLogsForCore,
    refreshCores: fetchCores,
    deleteCore,
    addCore,
    getCoreInterval,
  };
  
  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};

// 便捷的hook
export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};