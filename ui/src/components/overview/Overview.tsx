import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import CoreCard from './CoreCard';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { useAppData, Core } from '../../contexts/AppDataContext';

// 更新凭证类型定义，现在只有名称
type Credential = string;

const NoCore: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <p className="text-xl">尚未添加任何核心</p>
      <p className="mt-2">点击"添加核心"按钮开始</p>
    </div>
  );
};

// 更新CoresList组件
const CoresList: React.FC<{ 
  onDelete: (name: string) => void
}> = ({ onDelete }) => {
  const { cores, coreMetrics } = useAppData();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cores.map(core => (
        <CoreCard 
          key={core.name} 
          core={core}
          metrics={coreMetrics[core.name] || null}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

const Overview: React.FC = () => {
  // 从全局上下文获取数据
  const { isConnected, isReconnecting } = useWebSocketContext();
  const { 
    cores, 
    loading, 
    error, 
    deleteCore,
    addCore,
  } = useAppData();
  
  // 获取凭证列表
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [coreToDelete, setCoreToDelete] = useState<string | null>(null);
  
  // 用于添加Core的表单状态
  const [newCore, setNewCore] = useState<Omit<Core, 'name'> & { name: string, credential_name: string }>({
    name: '',
    host: 'localhost',
    port: 50051,
    interval: '1s',
    credential_name: ''
  });

  // 获取所有凭证
  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/credentials');
      if (!response.ok) throw new Error('Failed to fetch credentials');
      
      const data = await response.json();
      setCredentials(data);
      
      // 如果有凭证，默认选择第一个
      if (data.length > 0) {
        setNewCore(prev => ({
          ...prev,
          credential_name: data[0]
        }));
      }
    } catch (err) {
      console.error('获取凭证失败:', err);
      toast.error('无法获取凭证列表');
    }
  };

  // 组件加载时获取凭证数据
  useEffect(() => {
    fetchCredentials();
  }, []);

  // 处理添加核心
  const handleAddCore = async () => {
    const success = await addCore(newCore);
    if (success) {
      setShowAddModal(false);
      toast.success(`成功添加核心: ${newCore.name}`);
      // 重置表单
      setNewCore({
        name: '',
        host: 'localhost',
        port: 50051,
        interval: '1s',
        credential_name: credentials.length > 0 ? credentials[0] : ''
      });
    } else {
      toast.error('添加核心失败');
    }
  };

  // 处理删除核心
  const handleDeleteCore = async () => {
    if (!coreToDelete) return;
    
    const success = await deleteCore(coreToDelete);
    if (success) {
      setShowDeleteModal(false);
      setCoreToDelete(null);
      toast.success(`成功删除核心: ${coreToDelete}`);
    } else {
      toast.error(`删除核心失败: ${coreToDelete}`);
    }
  };

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewCore(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 md:p-6">
      {/* 标题和WebSocket状态显示 */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
          Multitasking 核心管理
        </h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : isReconnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm ${isConnected ? 'text-green-400' : isReconnecting ? 'text-yellow-400' : 'text-red-400'}`}>
            {isConnected ? '已连接' : isReconnecting ? '重连中...' : '未连接'}
          </span>
          <button 
            onClick={() => setShowAddModal(true)}
            className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            添加核心
          </button>
        </div>
      </header>

      {/* 错误提示和加载状态 */}
      {error && (
        <div className="mb-6 p-4 bg-red-500 bg-opacity-30 border border-red-500 rounded-md">
          {error}
        </div>
      )}

      {loading && cores.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Cores列表 */}
      {!loading && cores.length === 0 ? (
        <NoCore />
      ) : (
        <CoresList 
          onDelete={(name) => {
            setCoreToDelete(name);
            setShowDeleteModal(true);
          }} 
        />
      )}

      {/* 添加Core模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">添加新核心</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">名称</label>
                <input
                  type="text"
                  name="name"
                  value={newCore.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="核心名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">主机</label>
                <input
                  type="text"
                  name="host"
                  value={newCore.host}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="主机名或IP"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">端口</label>
                <input
                  type="number"
                  name="port"
                  value={newCore.port}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="端口号"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">更新间隔</label>
                <input
                  type="text"
                  name="interval"
                  value={newCore.interval}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如: 1s, 500ms"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">选择凭证</label>
                <select
                  name="credential_name"
                  value={newCore.credential_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {credentials.length === 0 ? (
                    <option value="" disabled>无可用凭证</option>
                  ) : (
                    credentials.map(cred => (
                      <option key={cred} value={cred}>
                        {cred}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleAddCore}
                disabled={!newCore.name || !newCore.host || !newCore.port || !newCore.interval || !newCore.credential_name}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">确认删除</h2>
            <p className="mb-6">
              您确定要删除核心 <span className="font-semibold text-red-400">{coreToDelete}</span> 吗？此操作无法撤销。
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCoreToDelete(null);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleDeleteCore}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;