const { contextBridge, ipcRenderer } = require('electron');

// 暴露壁纸API给渲染进程
contextBridge.exposeInMainWorld('wallpaperAPI', {
  getWallpapers: (page, size) => ipcRenderer.invoke('get-wallpapers', page, size),
  setWallpaper: (wallpaperId, forceSet = false) => ipcRenderer.invoke('set-wallpaper', wallpaperId, forceSet),
  uploadWallpaper: async (filePath) => {
    try {
      console.log('渲染进程调用上传壁纸:', filePath);
      const result = await ipcRenderer.invoke('upload-wallpapers', filePath);
      console.log('上传结果:', result);
      return result;
    } catch (error) {
      console.error('上传壁纸失败:', error);
      return { success: false, message: error.message };
    }
  },
  deleteWallpaper: (wallpaperPath) => ipcRenderer.invoke('delete-wallpaper', wallpaperPath),
  onWallpaperApplied: (callback) => {
    ipcRenderer.on('wallpaper-applied', (_, wallpaperId) => callback(wallpaperId));
  },
  stopDynamicWallpaper: () => ipcRenderer.invoke('stop-dynamic-wallpaper'),
  pauseDynamicWallpaper: (shouldPause = true) => ipcRenderer.invoke('pause-dynamic-wallpaper', shouldPause),
  reloadApp: () => ipcRenderer.invoke('reload-app')
});

// 暴露创意工坊API给渲染进程
contextBridge.exposeInMainWorld('workshopAPI', {
  getItems: (type) => ipcRenderer.invoke('workshop-get-items', type),
  getItemById: (id) => ipcRenderer.invoke('workshop-get-item', id),
  searchItems: (keyword) => ipcRenderer.invoke('workshop-search-items', keyword),
  downloadItem: (id) => ipcRenderer.invoke('workshop-download-item', id),
  likeItem: (id) => ipcRenderer.invoke('workshop-like-item', id),
  uploadItem: (data, previewPath, contentPath) => ipcRenderer.invoke('workshop-upload-item', data, previewPath, contentPath)
});

// 暴露Dock API给渲染进程
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