# CodeCanvas - 桌面定制软件

CodeCanvas是一款功能丰富的桌面定制软件，让您能够完全个性化您的桌面环境。本项目结合了多种优秀桌面定制软件的功能，包括壁纸引擎、桌面小组件、Dock任务栏以及桌宠精灵。

## 功能特点

- **壁纸库**：管理和应用静态/动态壁纸
- **创意工坊**：分享和下载社区创建的内容
- **桌面小组件**：天气、时钟、系统监控等实用工具
- **Dock任务栏**：美观实用的快速启动栏
- **桌宠精灵**：可爱的桌面宠物，提供互动体验
- **个性化设置**：调整所有功能的外观和行为

## 已实现功能

- **壁纸库**
  - 本地壁纸上传（支持多个文件）
  - 基于网格的壁纸显示布局
  - 自适应窗口大小调整
  - 左键双击应用壁纸
  - 右键菜单选项（应用壁纸/删除壁纸）
  - 无滚动条的可滚动网格视图
 
- **Dock任务栏**
  - 启用/禁用Dock栏
  - 自定义Dock外观（位置、尺寸、圆角、颜色、透明度）
  - 自动隐藏功能
  - 置顶显示设置
  - 实时应用设置变更

## 待实现功能

- **创意工坊**
  - 浏览社区项目
  - 按类型筛选项目（壁纸、小组件、Dock、桌宠）
  - 搜索项目
  - 下载项目
  - 点赞项目
  - 上传新项目

- **Dock任务栏扩展功能**
  - 添加应用图标到Dock
  - 自定义图标和主题
  - 更丰富的动画效果
  - 应用分组功能

- **桌面小组件**
  - 天气小组件
  - 时钟小组件
  - 系统监控小组件
  - 便签小组件
  - 自定义小组件

- **桌宠精灵**
  - 桌面宠物选择
  - 互动动画
  - 自定义行为
  - 语音互动

- **设置**
  - 主题设置
  - 语言设置
  - 启动设置
  - 性能优化

## 技术架构

- **Electron**：跨平台桌面应用框架
- **Java + Spring Boot**：后端服务
- **React**：前端用户界面
- **C++**：底层功能模块（如Dock栏、壁纸引擎）
- **Gradle**：构建系统

## 系统要求

- **Windows**：Windows 10及以上
- **macOS**：macOS 10.15 (Catalina)及以上
- **Linux**：支持主流发行版

## 快速开始

### 开发环境设置

1. 克隆仓库
   ```
   git clone https://github.com/yourusername/code-canvas.git
   cd code-canvas
   ```

2. 安装依赖
   ```
   # 安装Electron依赖
   cd my-electron-app
   npm install
   
   # 编译Java后端
   cd ..
   ./gradlew build
   
   # 编译C++模块
   cd Dock/src/cpp
   mkdir build && cd build
   cmake ..
   cmake --build .
   ```

3. 启动应用
   ```
   # 启动后端服务
   ./gradlew bootRun
   
   # 新开一个终端，启动Electron前端
   cd my-electron-app
   npm start
   ```

## 项目结构

```
code-canvas/
├── my-electron-app/         # Electron前端
│   ├── main.js              # 主进程入口
│   ├── preload.js           # 预加载脚本
│   └── renderer/            # 渲染进程
│       ├── components/      # React组件
│       ├── styles/          # CSS样式
│       ├── index.html       # HTML入口
│       └── index.js         # JS入口
├── src/                     # Java后端
│   └── main/
│       ├── java/
│       │   └── org/example/
│       │       ├── controller/  # REST控制器
│       │       ├── model/       # 数据模型
│       │       ├── service/     # 业务逻辑
│       │       └── Main.java    # Spring Boot入口
│       └── resources/       # 配置文件
├── Dock/                    # Dock模块
│   ├── bin/                 # 编译后的可执行文件
│   └── src/
│       ├── cpp/             # C++实现
│       └── electron/        # Electron集成
└── build.gradle.kts         # Gradle构建配置
```

## Dock模块

Dock模块是一个可自定义的任务栏，提供类似于macOS Dock或Nexus的功能。

### 功能特点

- 可定制外观（位置、尺寸、圆角、颜色、透明度）
- 支持自动隐藏
- 支持置顶显示
- 实时应用设置变更

### 技术实现

Dock模块由两部分组成：

1. **C++核心**：负责创建和管理Dock窗口，处理窗口样式、位置和交互
2. **Electron集成**：提供用户界面设置和与C++核心的通信

### 编译Dock模块

```bash
# 进入C++源码目录
cd Dock/src/cpp

# 创建并进入构建目录
mkdir build && cd build

# 配置CMake项目
cmake ..

# 编译
cmake --build .

# 复制到bin目录
copy DockBar.exe ../../bin/
```

## 开发指南

- 在修改代码前，请先理解项目结构和现有代码
- 遵循代码规范和注释惯例
- 对每个功能进行独立测试
- 定期提交代码并添加明确的提交信息

## 许可证

本项目基于MIT许可证开源。

## 贡献

欢迎提交问题和贡献代码！请查看[贡献指南](CONTRIBUTING.md)了解更多信息。

## C++壁纸核心功能

本项目集成了C++编写的壁纸核心功能，用于设置动态视频壁纸。

### 编译C++代码

项目使用Gradle的C++插件来编译C++代码。编译命令如下：

```bash
./gradlew build
```

编译后的C++可执行文件将位于`build/exe/wallpaperCore/`目录下。

### 使用Java调用C++程序

项目提供了`WallpaperManager`类，用于从Java代码中调用C++程序：

```java
import org.example.WallpaperManager;

// 设置视频壁纸
String videoPath = "D:\\Downloads\\video.mp4";
boolean success = WallpaperManager.setVideoAsWallpaper(videoPath, 2560, 1440);

if (success) {
    System.out.println("成功设置视频壁纸");
} else {
    System.out.println("设置视频壁纸失败");
}
```

### 依赖项

- Windows操作系统
- ffplay.exe (FFmpeg的一部分)
- Visual C++运行时库

### 注意事项

1. 确保ffplay.exe已正确安装并可在指定路径访问
2. 视频文件路径需要是绝对路径
3. 在Windows 10/11上可能需要管理员权限才能设置桌面壁纸
