const { contextBridge, ipcRenderer } = require('electron');

// 暴露Dock API到渲染进程
contextBridge.exposeInMainWorld('dockAPI', {
    // 获取Dock状态
    getStatus: () => ipcRenderer.invoke('dock-get-status'),
    
    // 启动Dock
    start: (config) => ipcRenderer.invoke('dock-start', config),
    
    // 停止Dock
    stop: () => ipcRenderer.invoke('dock-stop'),
    
    // 更新Dock配置
    updateConfig: (config) => ipcRenderer.invoke('dock-update-config', config),
    
    // 设置Dock启用状态
    setEnabled: (enabled) => ipcRenderer.invoke('dock-set-enabled', enabled)
}); 