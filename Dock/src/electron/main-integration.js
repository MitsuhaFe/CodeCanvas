/**
 * Dock管理器与Electron主进程的集成模块
 */

const DockManager = require('./dock-manager');

/**
 * 初始化Dock功能
 * @param {Electron.App} app - Electron应用实例
 */
function initializeDock(app) {
    // 创建Dock管理器实例
    const dockManager = new DockManager();
    
    // 应用退出时清理
    app.on('will-quit', () => {
        console.log('应用退出，清理Dock...');
        dockManager.cleanup();
    });
    
    // 如果配置设为启用，则启动Dock
    dockManager.loadConfig();
    if (dockManager.config.enabled) {
        console.log('自动启动Dock...');
        dockManager.startDock().then(result => {
            if (result.success) {
                console.log('Dock自动启动成功');
            } else {
                console.error('Dock自动启动失败:', result.message);
            }
        });
    }
    
    // 返回管理器实例
    return dockManager;
}

module.exports = { initializeDock }; 