// 添加一个工具函数，将interval字符串转换为毫秒数
export const ParseIntervalToMs = (interval: string): number => {
  // 默认返回值，如果解析失败
  const DEFAULT_TIMEOUT = 5000;
  
  try {
    // 处理带有ms的情况
    if (interval.endsWith('ms')) {
      return parseInt(interval.slice(0, -2)) || DEFAULT_TIMEOUT;
    }
    
    // 处理带有s的情况
    if (interval.endsWith('s')) {
      return (parseInt(interval.slice(0, -1)) || 1) * 1000;
    }
    
    // 处理带有m的情况(分钟)
    if (interval.endsWith('m')) {
      return (parseInt(interval.slice(0, -1)) || 1) * 60 * 1000;
    }
    
    // 如果没有单位，假设是毫秒
    return parseInt(interval) || DEFAULT_TIMEOUT;
  } catch {
    console.error('解析interval失败:', interval);
    return DEFAULT_TIMEOUT;
  }
};