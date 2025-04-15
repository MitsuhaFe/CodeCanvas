import React, { useState, useEffect } from 'react';
import './DockSettings.css';

/**
 * Dock设置组件
 * 用于控制Dock栏的外观和行为
 */
const DockSettings = () => {
    // 状态定义
    const [isEnabled, setIsEnabled] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [position, setPosition] = useState(0);
    const [width, setWidth] = useState(600);
    const [height, setHeight] = useState(60);
    const [cornerRadius, setCornerRadius] = useState(10);
    const [color, setColor] = useState({ r: 255, g: 255, b: 255 });
    const [alpha, setAlpha] = useState(200);
    const [autoHide, setAutoHide] = useState(false);
    const [alwaysOnTop, setAlwaysOnTop] = useState(true);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // 加载初始状态
    useEffect(() => {
        async function loadStatus() {
            try {
                const status = await window.dockAPI.getStatus();
                setIsRunning(status.running);
                
                // 更新所有配置状态
                const { config } = status;
                setIsEnabled(config.enabled);
                setPosition(config.position);
                setWidth(config.width);
                setHeight(config.height);
                setCornerRadius(config.cornerRadius);
                setColor(config.color);
                setAlpha(config.alpha);
                setAutoHide(config.autoHide);
                setAlwaysOnTop(config.alwaysOnTop);
                
                setLoading(false);
            } catch (error) {
                setMessage(`加载状态失败: ${error.message}`);
                setLoading(false);
            }
        }
        
        loadStatus();
    }, []);

    // 处理启用/禁用切换
    const handleToggleEnabled = async () => {
        try {
            setLoading(true);
            const result = await window.dockAPI.setEnabled(!isEnabled);
            
            if (result.success) {
                setIsEnabled(!isEnabled);
                setIsRunning(!isEnabled);
                setMessage(`Dock已${!isEnabled ? '启用' : '禁用'}`);
            } else {
                setMessage(`操作失败: ${result.message}`);
            }
            
            setLoading(false);
        } catch (error) {
            setMessage(`错误: ${error.message}`);
            setLoading(false);
        }
    };

    // 处理配置更新
    const handleUpdateConfig = async () => {
        try {
            setLoading(true);
            setMessage('正在应用设置...');
            
            const config = {
                position,
                width,
                height,
                cornerRadius,
                color,
                alpha,
                autoHide,
                alwaysOnTop
            };
            
            const result = await window.dockAPI.updateConfig(config);
            
            if (result.success) {
                setMessage('设置已应用');
            } else {
                setMessage(`应用设置失败: ${result.message}`);
            }
            
            setLoading(false);
        } catch (error) {
            setMessage(`错误: ${error.message}`);
            setLoading(false);
        }
    };

    // 处理刷新按钮点击
    const handleRefresh = async () => {
        try {
            setLoading(true);
            setMessage('正在刷新Dock...');
            
            // 首先停止Dock
            await window.dockAPI.stop();
            
            // 如果启用了Dock，则重新启动
            if (isEnabled) {
                const result = await window.dockAPI.start();
                if (result.success) {
                    setIsRunning(true);
                    setMessage('Dock已刷新');
                } else {
                    setIsRunning(false);
                    setMessage(`刷新Dock失败: ${result.message}`);
                }
            } else {
                setIsRunning(false);
                setMessage('Dock已停止');
            }
            
            setLoading(false);
        } catch (error) {
            setMessage(`错误: ${error.message}`);
            setLoading(false);
        }
    };

    // 颜色选择器组件
    const ColorPicker = ({ color, onChange }) => {
        const colorToHex = (color) => {
            const toHex = (value) => {
                const hex = value.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            
            return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
        };
        
        const hexToColor = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 255, g: 255, b: 255 };
        };
        
        const handleChange = (e) => {
            onChange(hexToColor(e.target.value));
        };
        
        return (
            <input 
                type="color" 
                value={colorToHex(color)} 
                onChange={handleChange} 
                className="color-picker"
            />
        );
    };

    if (loading) {
        return <div className="dock-settings loading">加载中...</div>;
    }

    return (
        <div className="dock-settings">
            <h2>Dock栏设置</h2>
            
            {message && (
                <div className="message">{message}</div>
            )}
            
            <div className="setting-row">
                <label>启用Dock</label>
                <label className="switch">
                    <input 
                        type="checkbox" 
                        checked={isEnabled} 
                        onChange={handleToggleEnabled} 
                    />
                    <span className="slider round"></span>
                </label>
            </div>
            
            <div className={`settings-container ${!isEnabled ? 'disabled' : ''}`}>
                <div className="setting-row">
                    <label>位置</label>
                    <select 
                        value={position} 
                        onChange={(e) => setPosition(Number(e.target.value))}
                        disabled={!isEnabled}
                    >
                        <option value={0}>底部</option>
                        <option value={1}>顶部</option>
                        <option value={2}>左侧</option>
                        <option value={3}>右侧</option>
                    </select>
                </div>
                
                <div className="setting-row">
                    <label>宽度</label>
                    <div className="slider-container">
                        <input 
                            type="range" 
                            min="200" 
                            max="2000" 
                            value={width} 
                            onChange={(e) => setWidth(Number(e.target.value))}
                            disabled={!isEnabled}
                        />
                        <span>{width}px</span>
                    </div>
                </div>
                
                <div className="setting-row">
                    <label>高度</label>
                    <div className="slider-container">
                        <input 
                            type="range" 
                            min="30" 
                            max="200" 
                            value={height} 
                            onChange={(e) => setHeight(Number(e.target.value))}
                            disabled={!isEnabled}
                        />
                        <span>{height}px</span>
                    </div>
                </div>
                
                <div className="setting-row">
                    <label>圆角</label>
                    <div className="slider-container">
                        <input 
                            type="range" 
                            min="0" 
                            max="30" 
                            value={cornerRadius} 
                            onChange={(e) => setCornerRadius(Number(e.target.value))}
                            disabled={!isEnabled}
                        />
                        <span>{cornerRadius}px</span>
                    </div>
                </div>
                
                <div className="setting-row">
                    <label>颜色</label>
                    <ColorPicker 
                        color={color} 
                        onChange={setColor}
                        disabled={!isEnabled}
                    />
                </div>
                
                <div className="setting-row">
                    <label>透明度</label>
                    <div className="slider-container">
                        <input 
                            type="range" 
                            min="50" 
                            max="255" 
                            value={alpha} 
                            onChange={(e) => setAlpha(Number(e.target.value))}
                            disabled={!isEnabled}
                        />
                        <span>{Math.round((alpha / 255) * 100)}%</span>
                    </div>
                </div>
                
                <div className="setting-row">
                    <label>自动隐藏</label>
                    <label className="switch">
                        <input 
                            type="checkbox" 
                            checked={autoHide} 
                            onChange={() => setAutoHide(!autoHide)}
                            disabled={!isEnabled}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
                
                <div className="setting-row">
                    <label>置顶显示</label>
                    <label className="switch">
                        <input 
                            type="checkbox" 
                            checked={alwaysOnTop} 
                            onChange={() => setAlwaysOnTop(!alwaysOnTop)}
                            disabled={!isEnabled}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
                
                <div className="button-container">
                    <button 
                        className="apply-button" 
                        onClick={handleUpdateConfig}
                        disabled={!isEnabled}
                    >
                        应用设置
                    </button>
                    
                    <button 
                        className="refresh-button" 
                        onClick={handleRefresh}
                        disabled={!isEnabled}
                    >
                        刷新Dock
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DockSettings; 