const { app, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

/**
 * Dock栏管理器类
 * 负责与C++实现的Dock程序进行通信和管理
 */
class DockManager {
    constructor() {
        this.dockProcess = null;
        this.config = {
            enabled: false,
            position: 0, // 0=底部, 1=顶部, 2=左侧, 3=右侧
            width: 600,
            height: 60,
            cornerRadius: 10,
            color: {
                r: 255,
                g: 255,
                b: 255
            },
            alpha: 200,
            autoHide: false,
            alwaysOnTop: true,
            fixedPosition: true // 添加固定位置选项
        };
        
        // 加载配置
        this.loadConfig();
        
        // 注册IPC事件处理
        this.registerIPCHandlers();
    }
    
    /**
     * 注册IPC事件处理函数
     */
    registerIPCHandlers() {
        // 获取Dock状态
        ipcMain.handle('dock-get-status', () => {
            return {
                running: this.dockProcess !== null,
                config: this.config
            };
        });
        
        // 启动Dock
        ipcMain.handle('dock-start', async (event, config) => {
            if (config) {
                // 更新配置
                this.config = { ...this.config, ...config };
                this.saveConfig();
            }
            
            return await this.startDock();
        });
        
        // 停止Dock
        ipcMain.handle('dock-stop', async () => {
            return await this.stopDock();
        });
        
        // 更新Dock配置
        ipcMain.handle('dock-update-config', async (event, config) => {
            // 更新配置
            this.config = { ...this.config, ...config };
            this.saveConfig();
            
            // 如果Dock正在运行，重启以应用新配置
            if (this.dockProcess !== null) {
                await this.stopDock();
                return await this.startDock();
            }
            
            return { success: true };
        });
        
        // 启用/禁用Dock
        ipcMain.handle('dock-set-enabled', async (event, enabled) => {
            this.config.enabled = enabled;
            this.saveConfig();
            
            if (enabled) {
                return await this.startDock();
            } else {
                return await this.stopDock();
            }
        });
    }
    
    /**
     * 加载Dock配置
     */
    loadConfig() {
        try {
            const configPath = path.join(app.getPath('userData'), 'dock-config.json');
            if (fs.existsSync(configPath)) {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.config = { ...this.config, ...configData };
                console.log('已加载Dock配置:', this.config);
            }
        } catch (error) {
            console.error('加载Dock配置失败:', error);
        }
    }
    
    /**
     * 保存Dock配置
     */
    saveConfig() {
        try {
            const configPath = path.join(app.getPath('userData'), 'dock-config.json');
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf8');
            console.log('已保存Dock配置');
        } catch (error) {
            console.error('保存Dock配置失败:', error);
        }
    }
    
    /**
     * 启动Dock程序
     */
    async startDock() {
        try {
            // 如果配置为禁用，则不启动
            if (!this.config.enabled) {
                console.log('Dock已禁用，不启动');
                return { success: false, message: 'Dock已禁用' };
            }
            
            // 如果已经有进程在运行，先停止
            if (this.dockProcess !== null) {
                await this.stopDock();
            }
            
            // 构建Dock可执行文件路径 - 首先尝试相对路径
            let dockExePath = path.join(__dirname, '../../../Dock/bin/DockBar.exe');
            
            // 如果相对路径不存在，尝试其他常见位置
            if (!fs.existsSync(dockExePath)) {
                const possiblePaths = [
                    path.join(__dirname, '../../bin/DockBar.exe'),
                    path.join(__dirname, '../bin/DockBar.exe'),
                    path.join(__dirname, '/bin/DockBar.exe'),
                    path.join(process.cwd(), 'Dock/bin/DockBar.exe'),
                    path.join(app.getAppPath(), 'Dock/bin/DockBar.exe')
                ];
                
                for (const testPath of possiblePaths) {
                    console.log('尝试路径:', testPath);
                    if (fs.existsSync(testPath)) {
                        dockExePath = testPath;
                        break;
                    }
                }
            }
            
            // 检查可执行文件是否存在
            if (!fs.existsSync(dockExePath)) {
                console.error('Dock可执行文件不存在:', dockExePath);
                console.error('当前目录:', process.cwd());
                console.error('__dirname:', __dirname);
                return { success: false, message: 'Dock可执行文件不存在，请确保已编译DockBar.exe' };
            }
            
            console.log('找到Dock可执行文件:', dockExePath);
            
            // 构建命令行参数
            const args = [
                '--position', this.config.position.toString(),
                '--width', this.config.width.toString(),
                '--height', this.config.height.toString(),
                '--corner-radius', this.config.cornerRadius.toString(),
                '--color', this.config.color.r.toString(), this.config.color.g.toString(), this.config.color.b.toString(),
                '--alpha', this.config.alpha.toString()
            ];
            
            // 添加可选参数
            if (this.config.autoHide) {
                args.push('--auto-hide');
            }
            
            if (!this.config.alwaysOnTop) {
                args.push('--no-always-on-top');
            }

            // 添加固定位置参数
            if (!this.config.fixedPosition) {
                args.push('--allow-drag');
            }
            
            console.log('启动Dock，路径:', dockExePath);
            console.log('参数:', args.join(' '));
            
            // 启动Dock进程
            this.dockProcess = spawn(dockExePath, args, {
                detached: true,
                stdio: 'ignore'
            });
            
            // 设置进程事件处理
            this.dockProcess.on('error', (error) => {
                console.error('启动Dock进程时出错:', error);
                this.dockProcess = null;
            });
            
            this.dockProcess.on('exit', (code) => {
                console.log('Dock进程已退出，代码:', code);
                this.dockProcess = null;
            });
            
            console.log('Dock进程已启动，PID:', this.dockProcess.pid);
            return { success: true };
        } catch (error) {
            console.error('启动Dock失败:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * 停止Dock程序
     */
    async stopDock() {
        return new Promise((resolve) => {
            if (this.dockProcess === null) {
                console.log('没有运行中的Dock进程');
                resolve({ success: true });
                return;
            }
            
            // 尝试优雅地关闭进程
            this.dockProcess.kill();
            
            // 设置超时，如果进程没有及时退出，强制杀死
            const timeout = setTimeout(() => {
                // 使用taskkill命令强制终止进程
                exec(`taskkill /F /PID ${this.dockProcess.pid}`, (error) => {
                    if (error) {
                        console.error('强制终止Dock进程失败:', error);
                    } else {
                        console.log('已强制终止Dock进程');
                    }
                    
                    this.dockProcess = null;
                    resolve({ success: true });
                });
            }, 1000);
            
            // 监听进程退出事件
            this.dockProcess.on('exit', () => {
                clearTimeout(timeout);
                this.dockProcess = null;
                console.log('Dock进程已成功停止');
                resolve({ success: true });
            });
        });
    }
    
    /**
     * 在应用退出时清理
     */
    cleanup() {
        this.stopDock();
    }
}

module.exports = DockManager; 