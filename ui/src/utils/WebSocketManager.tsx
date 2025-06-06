import { WebSocketMessage } from '../types';

// 单例模式的WebSocket管理器
class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = Infinity;
  private pingIntervalTime = 30000;
  private shouldReconnect = true;
  private subscribers = new Set<(message: WebSocketMessage) => void>();
  private connectionStatusSubscribers = new Set<(status: { isConnected: boolean; isReconnecting: boolean }) => void>();
  private isConnected = false;
  private isReconnecting = false;
  
  // 防止直接创建实例
  private constructor() {}
  
  // 获取单例实例
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  // 配置选项
  public configure(options: { pingInterval?: number; maxReconnectAttempts?: number }) {
    if (options.pingInterval) this.pingIntervalTime = options.pingInterval;
    if (options.maxReconnectAttempts !== undefined) this.maxReconnectAttempts = options.maxReconnectAttempts;
  }
  
  // 连接WebSocket
  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log('[DEBUG] WebSocket已经连接，跳过连接');
      return;
    }
    
    this.cleanup();
    
    console.log(`[DEBUG] 全局WebSocket尝试连接 (尝试 #${this.reconnectAttempts + 1})`);
    this.updateReconnectingStatus(this.reconnectAttempts > 0);
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws`);
      this.ws = ws;
      
      ws.onopen = this.handleOpen.bind(this);
      ws.onclose = this.handleClose.bind(this);
      ws.onerror = this.handleError.bind(this);
      ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('[DEBUG] 创建WebSocket时出错:', error);
      this.scheduleReconnect();
    }
  }
  
  private handleOpen() {
    console.log('[DEBUG] 全局WebSocket连接已建立');
    this.updateConnectionStatus(true);
    this.updateReconnectingStatus(false);
    this.reconnectAttempts = 0;
    
    // 设置一个ping定时器保持连接活跃
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('[DEBUG] 发送心跳包');
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.pingIntervalTime);
  }
  
  private handleClose(event: CloseEvent) {
    console.log(`[DEBUG] 全局WebSocket连接已关闭: code=${event.code}, reason="${event.reason}"`);
    this.updateConnectionStatus(false);
    this.cleanup(false);
    
    // 只有在应该重连且连接不是主动关闭的情况下才重连
    if (this.shouldReconnect && event.code !== 1000) {
      this.scheduleReconnect();
    } else {
      this.updateReconnectingStatus(false);
    }
  }
  
  private handleError(error: Event) {
    console.error('[DEBUG] 全局WebSocket错误:', error);
  }
  
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      // 如果是pong消息，直接返回
      if (data.type === 'pong') {
        console.log('[DEBUG] 收到pong心跳响应');
        return;
      }
      
      // 通知所有订阅者
      this.subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error('[DEBUG] 处理消息回调时出错:', err);
        }
      });
    } catch (error) {
      console.error('[DEBUG] 解析WebSocket消息时出错:', error);
    }
  }
  
  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.updateReconnectingStatus(true);
      
      const delay = Math.min(10000, 1000 * this.reconnectAttempts);
      console.log(`[DEBUG] 全局WebSocket将在 ${delay}ms 后尝试重新连接`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.log('[DEBUG] 全局WebSocket已达到最大重连次数，停止重连');
      this.updateReconnectingStatus(false);
      this.shouldReconnect = false;
    }
  }
  
  // 清理资源，但可选择不关闭WebSocket
  private cleanup(closeWebSocket = true) {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (closeWebSocket && this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch (error) {
        console.error('[DEBUG] 关闭全局WebSocket时出错:', error);
      }
      this.ws = null;
    }
  }
  
  // 更新连接状态并通知订阅者
  private updateConnectionStatus(isConnected: boolean) {
    if (this.isConnected !== isConnected) {
      this.isConnected = isConnected;
      this.notifyConnectionStatusChange();
    }
  }
  
  // 更新重连状态并通知订阅者
  private updateReconnectingStatus(isReconnecting: boolean) {
    if (this.isReconnecting !== isReconnecting) {
      this.isReconnecting = isReconnecting;
      this.notifyConnectionStatusChange();
    }
  }
  
  // 通知所有连接状态订阅者
  private notifyConnectionStatusChange() {
    const status = { isConnected: this.isConnected, isReconnecting: this.isReconnecting };
    this.connectionStatusSubscribers.forEach(callback => {
      try {
        callback(status);
      } catch (err) {
        console.error('[DEBUG] 处理连接状态回调时出错:', err);
      }
    });
  }
  
  // 发送消息
  public sendMessage(data: unknown): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[DEBUG] 发送消息:', data);
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    console.warn('[DEBUG] 无法发送消息：WebSocket未连接');
    return false;
  }
  
  // 订阅消息
  public subscribe(callback: (message: WebSocketMessage) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  // 订阅连接状态变化
  public subscribeToConnectionStatus(callback: (status: { isConnected: boolean; isReconnecting: boolean }) => void): () => void {
    this.connectionStatusSubscribers.add(callback);
    // 立即通知当前状态
    callback({ isConnected: this.isConnected, isReconnecting: this.isReconnecting });
    return () => {
      this.connectionStatusSubscribers.delete(callback);
    };
  }
  
  // 获取当前连接状态
  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts
    };
  }
  
  // 停止重连
  public stopReconnecting() {
    console.log('[DEBUG] 手动停止全局WebSocket重连');
    this.shouldReconnect = false;
    this.updateReconnectingStatus(false);
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  // 启动重连
  public startReconnecting() {
    console.log('[DEBUG] 手动启动全局WebSocket重连');
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.connect();
  }
  
  // 释放资源 - 通常只在应用真正退出时调用
  public dispose() {
    console.log('[DEBUG] 释放全局WebSocket资源');
    this.stopReconnecting();
    this.cleanup();
    this.subscribers.clear();
    this.connectionStatusSubscribers.clear();
  }
}

export default WebSocketManager;