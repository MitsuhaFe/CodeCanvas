// 浏览器版本的DockSettings组件
// 不使用import/export语法，直接定义全局变量

const DockSettings = () => {
    // 状态定义
    const [isEnabled, setIsEnabled] = React.useState(false);
    const [isRunning, setIsRunning] = React.useState(false);
    const [position, setPosition] = React.useState(0);
    const [width, setWidth] = React.useState(600);
    const [height, setHeight] = React.useState(60);
    const [cornerRadius, setCornerRadius] = React.useState(10);
    const [color, setColor] = React.useState({ r: 255, g: 255, b: 255 });
    const [alpha, setAlpha] = React.useState(200);
    const [autoHide, setAutoHide] = React.useState(false);
    const [alwaysOnTop, setAlwaysOnTop] = React.useState(true);
    const [fixedPosition, setFixedPosition] = React.useState(true);
    const [loading, setLoading] = React.useState(true);
    const [message, setMessage] = React.useState('');

    // 加载初始状态
    React.useEffect(() => {
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
                setFixedPosition(config.fixedPosition !== undefined ? config.fixedPosition : true);
                
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
                alwaysOnTop,
                fixedPosition
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
            React.createElement('input', {
                type: 'color',
                value: colorToHex(color),
                onChange: handleChange,
                className: 'color-picker'
            })
        );
    };

    if (loading) {
        return React.createElement('div', { className: 'dock-settings loading' }, '加载中...');
    }

    return React.createElement(
        'div', 
        { className: 'dock-settings' },
        [
            React.createElement('h2', { key: 'title' }, 'Dock栏设置'),
            
            message && React.createElement('div', { key: 'message', className: 'message' }, message),
            
            React.createElement('div', { key: 'enable-row', className: 'setting-row' }, [
                React.createElement('label', { key: 'enable-label' }, '启用Dock'),
                React.createElement('label', { key: 'enable-switch', className: 'switch' }, [
                    React.createElement('input', { 
                        key: 'enable-input',
                        type: 'checkbox',
                        checked: isEnabled,
                        onChange: handleToggleEnabled
                    }),
                    React.createElement('span', { key: 'enable-slider', className: 'slider round' })
                ])
            ]),
            
            React.createElement('div', { 
                key: 'settings-container',
                className: `settings-container ${!isEnabled ? 'disabled' : ''}` 
            }, [
                // 位置选择
                React.createElement('div', { key: 'position-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'position-label' }, '位置'),
                    React.createElement('select', { 
                        key: 'position-select',
                        value: position,
                        onChange: (e) => setPosition(Number(e.target.value)),
                        disabled: !isEnabled
                    }, [
                        React.createElement('option', { key: 'pos-0', value: 0 }, '底部'),
                        React.createElement('option', { key: 'pos-1', value: 1 }, '顶部'),
                        React.createElement('option', { key: 'pos-2', value: 2 }, '左侧'),
                        React.createElement('option', { key: 'pos-3', value: 3 }, '右侧')
                    ])
                ]),
                
                // 宽度设置
                React.createElement('div', { key: 'width-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'width-label' }, '宽度'),
                    React.createElement('div', { key: 'width-container', className: 'slider-container' }, [
                        React.createElement('input', {
                            key: 'width-slider',
                            type: 'range',
                            min: 20,
                            max: 4000,
                            value: width,
                            onChange: (e) => setWidth(Number(e.target.value)),
                            disabled: !isEnabled
                        }),
                        React.createElement('span', { key: 'width-value' }, `${width}px`)
                    ])
                ]),
                
                // 高度设置
                React.createElement('div', { key: 'height-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'height-label' }, '高度'),
                    React.createElement('div', { key: 'height-container', className: 'slider-container' }, [
                        React.createElement('input', {
                            key: 'height-slider',
                            type: 'range',
                            min: 20,
                            max: 4000,
                            value: height,
                            onChange: (e) => setHeight(Number(e.target.value)),
                            disabled: !isEnabled
                        }),
                        React.createElement('span', { key: 'height-value' }, `${height}px`)
                    ])
                ]),
                
                // 圆角设置
                React.createElement('div', { key: 'corner-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'corner-label' }, '圆角'),
                    React.createElement('div', { key: 'corner-container', className: 'slider-container' }, [
                        React.createElement('input', {
                            key: 'corner-slider',
                            type: 'range',
                            min: 0,
                            max: 99,
                            value: cornerRadius,
                            onChange: (e) => setCornerRadius(Number(e.target.value)),
                            disabled: !isEnabled
                        }),
                        React.createElement('span', { key: 'corner-value' }, `${cornerRadius}px`)
                    ])
                ]),
                
                // 颜色设置
                React.createElement('div', { key: 'color-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'color-label' }, '颜色'),
                    React.createElement(ColorPicker, {
                        key: 'color-picker',
                        color: color,
                        onChange: setColor,
                        disabled: !isEnabled
                    })
                ]),
                
                // 透明度设置
                React.createElement('div', { key: 'alpha-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'alpha-label' }, '透明度'),
                    React.createElement('div', { key: 'alpha-container', className: 'slider-container' }, [
                        React.createElement('input', {
                            key: 'alpha-slider',
                            type: 'range',
                            min: 0,
                            max: 255,
                            value: alpha,
                            onChange: (e) => setAlpha(Number(e.target.value)),
                            disabled: !isEnabled
                        }),
                        React.createElement('span', { key: 'alpha-value' }, `${Math.round((alpha / 255) * 100)}%`)
                    ])
                ]),
                
                // 自动隐藏设置
                React.createElement('div', { key: 'autohide-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'autohide-label' }, '自动隐藏'),
                    React.createElement('label', { key: 'autohide-switch', className: 'switch' }, [
                        React.createElement('input', {
                            key: 'autohide-input',
                            type: 'checkbox',
                            checked: autoHide,
                            onChange: () => setAutoHide(!autoHide),
                            disabled: !isEnabled
                        }),
                        React.createElement('span', { key: 'autohide-slider', className: 'slider round' })
                    ])
                ]),
                
                // 置顶显示设置
                React.createElement('div', { key: 'alwaysontop-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'alwaysontop-label' }, '置顶显示'),
                    React.createElement('label', { key: 'alwaysontop-switch', className: 'switch' }, [
                        React.createElement('input', {
                            key: 'alwaysontop-input',
                            type: 'checkbox',
                            checked: alwaysOnTop,
                            onChange: () => setAlwaysOnTop(!alwaysOnTop),
                            disabled: !isEnabled
                        }),
                        React.createElement('span', { key: 'alwaysontop-slider', className: 'slider round' })
                    ])
                ]),
                
                // 固定位置设置
                React.createElement('div', { key: 'fixedposition-row', className: 'setting-row' }, [
                    React.createElement('label', { key: 'fixedposition-label' }, '固定位置'),
                    React.createElement('label', { key: 'fixedposition-switch', className: 'switch' }, [
                        React.createElement('input', {
                            key: 'fixedposition-input',
                            type: 'checkbox',
                            checked: fixedPosition,
                            onChange: () => setFixedPosition(!fixedPosition),
                            disabled: !isEnabled
                        }),
                        React.createElement('span', { key: 'fixedposition-slider', className: 'slider round' })
                    ])
                ]),
                
                // 按钮区域
                React.createElement('div', { key: 'button-container', className: 'button-container' }, [
                    React.createElement('button', {
                        key: 'apply-btn',
                        className: 'apply-button',
                        onClick: handleUpdateConfig,
                        disabled: !isEnabled
                    }, '应用设置'),
                    
                    React.createElement('button', {
                        key: 'refresh-btn',
                        className: 'refresh-button',
                        onClick: handleRefresh,
                        disabled: !isEnabled
                    }, '刷新Dock')
                ])
            ])
        ]
    );
}; 