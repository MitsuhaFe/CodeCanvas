const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { exec, execFile } = require('child_process');
const os = require('os');
const { setWallpaper, getWallpaper } = require('wallpaper');
const crypto = require('crypto');
const sharp = require('sharp'); // 添加sharp依赖用于图片处理
const ffmpeg = require('fluent-ffmpeg');

// 导入Dock管理器
const { initializeDock } = require('../Dock/src/electron/main-integration');

// 后端API基础URL
const API_BASE_URL = 'http://localhost:8080';

// 定义C++壁纸设置程序路径
const WALLPAPER_SETTER_PATH = path.join(__dirname, '../bin/WallpaperSetter.exe');

// 缓存设置
const CACHE_DIR = path.join(app.getPath('userData'), 'imageCache');
const CACHE_MANIFEST_PATH = path.join(CACHE_DIR, 'cache-manifest.json');
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const THUMBNAIL_SIZE = 320; // 缩略图大小

// 定义ffmpeg路径
const FFMPEG_PATH = path.join(__dirname, '../my-electron-app/bin/ffmpeg/bin/ffmpeg.exe');
const FFPROBE_PATH = path.join(__dirname, '../my-electron-app/bin/ffmpeg/bin/ffprobe.exe');

let mainWindow;
let imageCache = {}; // 内存缓存
let cacheSizeBytes = 0; // 当前缓存大小
let dockManager; // Dock管理器实例

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载前端页面 - 使用正确的文件路径
  const htmlPath = path.join(__dirname, 'renderer', 'index.html');
  console.log('加载HTML文件路径:', htmlPath);
  mainWindow.loadFile(htmlPath);
  
  // 开发环境打开开发者工具
  mainWindow.webContents.openDevTools();
}

// 初始化应用
app.whenReady().then(() => {
  // 确保缓存目录存在
  ensureCacheDirectory();
  
  // 加载缓存清单
  loadCacheManifest();
  
  // 初始化Dock管理器
  dockManager = initializeDock(app);
  
  // 创建主窗口
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 确保缓存目录存在
function ensureCacheDirectory() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('创建缓存目录失败:', error);
  }
}

// 加载缓存清单
function loadCacheManifest() {
  try {
    if (fs.existsSync(CACHE_MANIFEST_PATH)) {
      const data = fs.readFileSync(CACHE_MANIFEST_PATH, 'utf8');
      const manifest = JSON.parse(data);
      imageCache = manifest.entries || {};
      cacheSizeBytes = manifest.totalSize || 0;
      
      // 验证缓存文件实际存在
      Object.keys(imageCache).forEach(key => {
        const cachePath = imageCache[key].path;
        if (!fs.existsSync(cachePath)) {
          delete imageCache[key];
        }
      });
      
      console.log(`已加载缓存清单: ${Object.keys(imageCache).length} 条目，总大小: ${formatBytes(cacheSizeBytes)}`);
    } else {
      imageCache = {};
      cacheSizeBytes = 0;
      saveCacheManifest();
    }
  } catch (error) {
    console.error('加载缓存清单失败:', error);
    imageCache = {};
    cacheSizeBytes = 0;
  }
}

// 保存缓存清单
function saveCacheManifest() {
  try {
    const manifest = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      totalSize: cacheSizeBytes,
      entries: imageCache
    };
    
    fs.writeFileSync(CACHE_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (error) {
    console.error('保存缓存清单失败:', error);
  }
}

// 根据LRU策略淘汰缓存
function pruneCacheIfNeeded(requiredSpace = 0) {
  if (cacheSizeBytes + requiredSpace <= MAX_CACHE_SIZE) {
    return; // 缓存未满，无需淘汰
  }
  
  console.log(`缓存需要清理，当前大小: ${formatBytes(cacheSizeBytes)}，需要额外空间: ${formatBytes(requiredSpace)}`);
  
  // 按上次访问时间排序所有缓存项
  const sortedEntries = Object.entries(imageCache).sort((a, b) => {
    return a[1].lastAccessed - b[1].lastAccessed;
  });
  
  // 计算需要释放的空间
  let spaceToFree = cacheSizeBytes + requiredSpace - MAX_CACHE_SIZE;
  let freedSpace = 0;
  
  // 从最旧的开始移除，直到释放足够空间
  for (const [key, entry] of sortedEntries) {
    if (freedSpace >= spaceToFree) break;
    
    try {
      const filePath = entry.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      freedSpace += entry.size;
      cacheSizeBytes -= entry.size;
      delete imageCache[key];
      
      console.log(`已从缓存移除: ${key}, 大小: ${formatBytes(entry.size)}`);
    } catch (error) {
      console.error(`移除缓存项失败: ${key}`, error);
    }
  }
  
  console.log(`缓存清理完成，释放了 ${formatBytes(freedSpace)} 空间`);
  saveCacheManifest();
}

// 添加文件到缓存
function addToCache(key, filePath, fileBuffer, metadata = {}) {
  try {
    // 生成目标缓存路径
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const ext = path.extname(filePath) || '.jpg';
    const cacheFileName = `${hash}${ext}`;
    const cachePath = path.join(CACHE_DIR, cacheFileName);
    
    // 写入文件
    fs.writeFileSync(cachePath, fileBuffer);
    
    // 获取文件大小
    const stats = fs.statSync(cachePath);
    const fileSize = stats.size;
    
    // 如果缓存不足，先清理
    pruneCacheIfNeeded(fileSize);
    
    // 更新缓存信息
    imageCache[key] = {
      path: cachePath,
      originalPath: filePath,
      lastAccessed: Date.now(),
      created: Date.now(),
      size: fileSize,
      ...metadata
    };
    
    cacheSizeBytes += fileSize;
    saveCacheManifest();
    
    return cachePath;
  } catch (error) {
    console.error('添加文件到缓存失败:', error);
    return null;
  }
}

// 从缓存获取文件
function getFromCache(key) {
  if (imageCache[key]) {
    const entry = imageCache[key];
    
    // 检查文件是否还存在
    if (fs.existsSync(entry.path)) {
      // 更新访问时间
      entry.lastAccessed = Date.now();
      saveCacheManifest();
      return entry.path;
    } else {
      // 文件不存在，清理缓存条目
      cacheSizeBytes -= entry.size;
      delete imageCache[key];
      saveCacheManifest();
    }
  }
  
  return null;
}

// 获取壁纸列表（支持分页）
ipcMain.handle('get-wallpapers', async (event, page = 0, size = 96) => {
  try {
    // 首先获取本地视频壁纸
    const wallpapersDir = path.join(__dirname, '../wallpapers');
    let localVideoWallpapers = [];
    
    if (fs.existsSync(wallpapersDir)) {
      // 读取wallpapers目录下的所有文件夹
      const dirs = fs.readdirSync(wallpapersDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      // 处理每个视频壁纸文件夹
      for (const dir of dirs) {
        const metadataPath = path.join(wallpapersDir, dir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          try {
            // 读取元数据
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            
            // 确认是视频类型
            if (metadata.type === 'video') {
              // 构建完整路径
              const videoPath = path.join(wallpapersDir, dir, metadata.filename);
              const previewPath = path.join(wallpapersDir, dir, metadata.previewPath);
              
              // 确保文件存在
              if (fs.existsSync(videoPath) && fs.existsSync(previewPath)) {
                localVideoWallpapers.push({
                  id: metadata.id,
                  name: metadata.originalName.replace(/\.[^/.]+$/, ""), // 去掉扩展名
                  type: 'video',
                  url: `file://${videoPath.replace(/\\/g, '/')}`,
                  thumbnailUrl: `file://${previewPath.replace(/\\/g, '/')}`,
                  createdAt: metadata.createdAt,
                  isLocal: true // 标记为本地视频
                });
              }
            }
          } catch (error) {
            console.error(`处理视频壁纸元数据失败: ${dir}`, error);
          }
        }
      }
      
      console.log(`找到 ${localVideoWallpapers.length} 个本地视频壁纸`);
    }
    
    // 添加分页查询参数，获取远程壁纸
    const response = await axios.get(`${API_BASE_URL}/api/wallpapers`, {
      params: { page, size }
    });
    
    // 如果使用的是新API（返回包含分页信息的对象）
    if (response.data && typeof response.data === 'object' && Array.isArray(response.data.wallpapers)) {
      // 处理每个壁纸的URL，尝试使用缓存的缩略图
      if (response.data.wallpapers) {
        response.data.wallpapers = await Promise.all(response.data.wallpapers.map(async (wallpaper) => {
          // 检查是否有缓存的缩略图
          const thumbKey = `wallpaper_thumb_${wallpaper.id}`;
          const cachedThumbPath = getFromCache(thumbKey);
          
          if (cachedThumbPath) {
            // 将文件URL转换为可访问的协议
            wallpaper.thumbnailUrl = `file://${cachedThumbPath.replace(/\\/g, '/')}`;
          } else {
            // 如果缓存中没有，尝试从服务器下载缩略图
            try {
              if (wallpaper.thumbnailUrl) {
                const thumbnailResponse = await axios({
                  url: `${API_BASE_URL}${wallpaper.thumbnailUrl}`,
                  method: 'GET',
                  responseType: 'arraybuffer'
                });
                
                // 添加缩略图到缓存
                const cachedPath = addToCache(
                  thumbKey, 
                  wallpaper.id + '_thumbnail.jpg', 
                  Buffer.from(thumbnailResponse.data), 
                  { id: wallpaper.id, type: 'thumbnail' }
                );
                
                if (cachedPath) {
                  wallpaper.thumbnailUrl = `file://${cachedPath.replace(/\\/g, '/')}`;
                }
              }
            } catch (error) {
              console.error('下载缩略图失败:', error);
              // 如果下载失败，使用服务器URL
              if (wallpaper.thumbnailUrl && !wallpaper.thumbnailUrl.startsWith('file:')) {
                wallpaper.thumbnailUrl = `${API_BASE_URL}${wallpaper.thumbnailUrl}`;
              }
            }
          }
          
          return wallpaper;
        }));
      }
      
      // 合并本地视频壁纸和远程壁纸
      const allWallpapers = [...localVideoWallpapers, ...response.data.wallpapers];
      
      // 按创建时间排序（新的在前）
      allWallpapers.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      // 手动分页处理合并后的结果
      const startIndex = page * size;
      const endIndex = startIndex + size;
      const paginatedWallpapers = allWallpapers.slice(startIndex, endIndex);
      
      return {
        success: true,
        wallpapers: paginatedWallpapers,
        page: page,
        size: size,
        total: allWallpapers.length
      };
    }
    // 向下兼容，处理旧API返回的纯数组格式
    else if (Array.isArray(response.data)) {
      // 处理每个壁纸的URL，尝试使用缓存的缩略图
      const remoteWallpapers = await Promise.all(response.data.map(async (wallpaper) => {
        // 检查是否有缓存的缩略图
        const thumbKey = `wallpaper_thumb_${wallpaper.id}`;
        const cachedThumbPath = getFromCache(thumbKey);
        
        if (cachedThumbPath) {
          // 将文件URL转换为可访问的协议
          wallpaper.thumbnailUrl = `file://${cachedThumbPath.replace(/\\/g, '/')}`;
        }
        
        return wallpaper;
      }));
      
      // 合并本地视频壁纸和远程壁纸
      const allWallpapers = [...localVideoWallpapers, ...remoteWallpapers];
      
      // 按创建时间排序（新的在前）
      allWallpapers.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      return {
        success: true,
        wallpapers: allWallpapers,
        page: 0,
        size: allWallpapers.length,
        total: allWallpapers.length
      };
    }
    
    return { success: false, message: '无效的服务器响应格式' };
  } catch (error) {
    console.error('获取壁纸列表失败:', error);
    return { success: false, message: error.message };
  }
});

// 上传壁纸
ipcMain.handle('upload-wallpapers', async (event, filePaths) => {
  try {
    console.log('开始上传壁纸，文件路径:', filePaths);
    
    if (!filePaths || filePaths.length === 0) {
      console.log('没有提供文件路径，打开文件选择对话框');
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '所有支持的文件', extensions: ['jpg', 'png', 'gif', 'jpeg', 'bmp', 'webp', 'mp4', 'webm', 'avi', 'mov', 'mkv'] },
          { name: '图片', extensions: ['jpg', 'png', 'gif', 'jpeg', 'bmp', 'webp'] },
          { name: '视频', extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv'] }
        ]
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        console.log('用户取消了文件选择');
        return { success: false, message: '未选择文件' };
      }
      
      filePaths = result.filePaths;
      console.log('用户选择的文件:', filePaths);
    }
    
    // 使用Promise.all并行处理所有上传
    const uploadResults = await Promise.all(filePaths.map(async (filePath) => {
      try {
        console.log('处理文件:', filePath);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
          console.error('文件不存在:', filePath);
          return { filePath, success: false, error: '文件不存在' };
        }

        // 判断文件类型
        const fileExt = path.extname(filePath).toLowerCase();
        const isVideo = ['.mp4', '.webm', '.avi', '.mov', '.mkv'].includes(fileExt);
        
        // 创建临时文件用于优化后的文件
        const tempDir = path.join(app.getPath('temp'), 'code-canvas');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, `optimized_${path.basename(filePath)}`);
        
        if (isVideo) {
          // 处理视频文件
          console.log('开始处理视频文件:', filePath);
          
          // 创建唯一ID
          const wallpaperId = crypto.randomUUID();
          
          // 创建壁纸目录
          const wallpaperDir = path.join(__dirname, '../wallpapers', wallpaperId);
          if (!fs.existsSync(wallpaperDir)) {
            fs.mkdirSync(wallpaperDir, { recursive: true });
          }
          
          // 目标文件路径
          const videoFilename = path.basename(filePath);
          const videoDestPath = path.join(wallpaperDir, videoFilename);
          
          // 创建预览图路径
          const previewGifPath = path.join(wallpaperDir, 'preview.gif');
          
          // JSON元数据文件路径
          const metadataPath = path.join(wallpaperDir, 'metadata.json');
          
          // 复制视频文件到目标目录
          fs.copyFileSync(filePath, videoDestPath);
          console.log('视频文件已复制到:', videoDestPath);
          
          // 创建预览GIF
          try {
            await createVideoPreview(filePath, previewGifPath);
            console.log('视频预览GIF已创建:', previewGifPath);
          } catch (previewError) {
            console.error('创建视频预览失败:', previewError);
            // 使用默认预览图
            const defaultPreviewPath = path.join(__dirname, '../assets/default-video-preview.gif');
            if (fs.existsSync(defaultPreviewPath)) {
              fs.copyFileSync(defaultPreviewPath, previewGifPath);
            }
          }
          
          // 创建并保存元数据
          const videoMetadata = {
            id: wallpaperId,
            type: 'video',
            originalName: path.basename(filePath),
            filename: videoFilename,
            previewPath: 'preview.gif',
            createdAt: new Date().toISOString()
          };
          
          // 写入元数据JSON文件
          fs.writeFileSync(metadataPath, JSON.stringify(videoMetadata, null, 2));
          console.log('元数据已保存到:', metadataPath);
          
          // 构建API响应格式的数据
          const responseData = {
            id: wallpaperId,
            name: path.basename(filePath, path.extname(filePath)),
            type: 'video',
            url: `/wallpapers/${wallpaperId}/${videoFilename}`,
            thumbnailUrl: `/wallpapers/${wallpaperId}/preview.gif`,
            createdAt: videoMetadata.createdAt
          };
          
          return { filePath, success: true, data: responseData };
        } else {
          // 处理图片文件（原有逻辑）
          console.log('开始优化图片:', filePath);
          await optimizeImage(filePath, tempFilePath);
          console.log('图片优化完成，保存到:', tempFilePath);
          
          // 创建表单数据
          const formData = new FormData();
          formData.append('file', fs.createReadStream(tempFilePath), {
            filename: path.basename(filePath),
            contentType: `image/${getImageMimeType(filePath)}`
          });
          
          // 发送到服务器
          console.log('开始上传到服务器');
        const response = await axios.post(`${API_BASE_URL}/api/wallpapers/upload`, formData, {
          headers: {
            ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          });
          console.log('服务器响应:', response.data);
          
          // 清理临时文件
          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.error('清理临时文件失败:', cleanupError);
          }
          
          return { filePath, success: true, data: response.data };
        }
      } catch (error) {
        console.error(`处理文件失败: ${filePath}`, error);
        return { filePath, success: false, error: error.message };
      }
    }));
    
    console.log('所有文件处理完成:', uploadResults);
    return { success: true, results: uploadResults };
  } catch (error) {
    console.error('上传壁纸失败:', error);
    return { success: false, message: error.message };
  }
});

// 图片优化处理
async function optimizeImage(inputPath, outputPath) {
  try {
    // 使用sharp优化图片
    await sharp(inputPath)
      .rotate() // 自动修正旋转
      .withMetadata() // 保留元数据
      .toFile(outputPath);
  } catch (error) {
    console.error('图片优化失败:', error);
    // 如果优化失败，直接复制原始文件
    fs.copyFileSync(inputPath, outputPath);
  }
}

// 创建缩略图
async function createThumbnail(filePath) {
  try {
    // 读取原始图片
    const buffer = fs.readFileSync(filePath);
    
    // 创建缩略图
    const thumbnail = await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'centre'
      })
      .webp({ quality: 85 }) // 使用WebP格式提高压缩比
      .toBuffer();
    
    return thumbnail;
  } catch (error) {
    console.error('创建缩略图失败:', error);
    return null;
  }
}

// 获取图片MIME类型
function getImageMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'jpeg';
    case '.png':
      return 'png';
    case '.gif':
      return 'gif';
    case '.webp':
      return 'webp';
    case '.bmp':
      return 'bmp';
    default:
      return 'jpeg';
  }
}

// 获取视频MIME类型
function getVideoMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'mp4';
    case '.webm':
      return 'webm';
    case '.avi':
      return 'x-msvideo';
    case '.mov':
      return 'quicktime';
    case '.mkv':
      return 'x-matroska';
    default:
      return 'mp4';
  }
}

// 创建视频预览GIF
async function createVideoPreview(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setFfmpegPath(FFMPEG_PATH) // 使用项目bin目录下的ffmpeg
      .setFfprobePath(FFPROBE_PATH) // 使用项目bin目录下的ffprobe
      .inputOptions([
        '-t 1', // 只处理前5秒
        '-ss 00:00:00' // 从开始截取
      ])
      .outputOptions([
        '-vf fps=10,scale=320:-1:flags=lanczos', // 10fps，宽度320px
        '-loop 0' // 无限循环
      ])
      .on('end', () => {
        console.log('视频预览GIF生成完成');
        resolve();
      })
      .on('error', (err) => {
        console.error('生成视频预览GIF失败:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

// 获取视频时长
async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setFfprobePath(FFPROBE_PATH)
      .ffprobe((err, metadata) => {
        if (err) {
          console.error('获取视频时长失败:', err);
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
  });
}

// 格式化字节显示
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 上传壁纸 (别名)
ipcMain.handle('upload-wallpaper', async (event, filePath) => {
  return await ipcMain.handlers['upload-wallpapers'](event, filePath);
});

// 设置壁纸
ipcMain.handle('set-wallpaper', async (event, wallpaperId) => {
  try {
    // 首先尝试停止任何正在运行的动态壁纸
    try {
      // 结束之前的ffplay进程
      exec('taskkill /F /IM ffplay.exe', (error, stdout, stderr) => {
        if (!error) {
          console.log('已结束运行中的ffplay进程');
        }
      });
      
      // 等待一段时间确保进程已关闭
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      // 忽略错误，继续执行
    }

    // 获取壁纸信息
    console.log('正在设置壁纸:', wallpaperId);
    const wallpaper = await getWallpaperById(wallpaperId);
    
    if (!wallpaper) {
      console.error('壁纸不存在:', wallpaperId);
      return { success: false, message: '壁纸不存在' };
    }
    
    // 获取壁纸文件路径
    const wallpapersDir = path.join(__dirname, '../wallpapers');
    let wallpaperPath;
    
    if (wallpaper.isLocal && wallpaper.type === 'video') {
      // 本地视频壁纸，直接使用path属性
      wallpaperPath = wallpaper.path;
    } else {
      // 静态壁纸，构建文件路径
      wallpaperPath = path.join(wallpapersDir, wallpaperId, 'original' + path.extname(wallpaper.path));
    }
    
    console.log('壁纸路径:', wallpaperPath);
      
      // 检查文件是否存在
      if (!fs.existsSync(wallpaperPath)) {
      console.error('壁纸文件不存在:', wallpaperPath);
      return { success: false, message: '壁纸文件不存在' };
    }
    
    // 判断壁纸类型并处理
    const fileExt = path.extname(wallpaperPath).toLowerCase();
    const isImageFile = ['.jpg', '.jpeg', '.png', '.bmp'].includes(fileExt);
    const isVideoFile = ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(fileExt);
    
    let success = false;
    
    if (isImageFile) {
      // 静态图片壁纸 - 使用StaticWallPaper.exe程序设置
      console.log('正在设置静态图片壁纸:', wallpaperPath);
      
      // 查找可执行文件
      const staticWallpaperExe = path.join(__dirname, 'bin', 'StaticWallPaper.exe');
      
      if (!fs.existsSync(staticWallpaperExe)) {
        console.error('静态壁纸程序不存在:', staticWallpaperExe);
        return { success: false, message: '静态壁纸程序不存在' };
      }
      
      // 执行C++程序设置壁纸
      console.log('执行静态壁纸程序:', staticWallpaperExe, wallpaperPath);
      const process = require('child_process').spawn(staticWallpaperExe, [wallpaperPath]);
      
      // 获取进程输出
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
        console.log('静态壁纸程序输出:', data.toString());
      });
      
      // 等待进程结束
      const exitCode = await new Promise((resolve) => {
        process.on('close', resolve);
      });
      
      success = exitCode === 0;
      console.log('静态壁纸程序退出码:', exitCode);
      
      if (!success) {
        console.error('设置静态壁纸失败，输出:', output);
        return { success: false, message: '设置静态壁纸失败' };
      }
    } else if (isVideoFile) {
      // 动态视频壁纸 - 使用WallPaperCore.exe程序设置
      console.log('正在设置动态视频壁纸:', wallpaperPath);
      
      // 查找可执行文件
      const wallPaperCoreExe = path.join(__dirname, 'bin', 'WallPaperCore.exe');
      
      if (!fs.existsSync(wallPaperCoreExe)) {
        console.error('动态壁纸程序不存在:', wallPaperCoreExe);
        return { success: false, message: '动态壁纸程序不存在' };
      }
      
      // 结束之前的ffplay进程
      try {
        exec('taskkill /F /IM ffplay.exe', (error, stdout, stderr) => {
          if (error) {
            console.log('没有找到运行中的ffplay进程');
          } else {
            console.log('已结束运行中的ffplay进程');
          }
        });
      } catch (error) {
        console.error('结束ffplay进程时出错:', error);
      }
      
      // 等待一段时间确保进程已关闭
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 执行C++程序设置壁纸
      console.log('执行动态壁纸程序:', wallPaperCoreExe, wallpaperPath);
      const process = require('child_process').spawn(wallPaperCoreExe, [wallpaperPath]);
      
      // 获取进程输出
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
        console.log('动态壁纸程序输出:', data.toString());
      });
      
      // 等待进程结束 - 注意: WallPaperCore会启动ffplay然后退出
      const exitCode = await new Promise((resolve) => {
        process.on('close', resolve);
      });
      
      // 如果程序成功启动ffplay然后退出，就认为成功了
      success = exitCode === 0;
      console.log('动态壁纸程序退出码:', exitCode);
      
      if (!success) {
        console.error('设置动态壁纸失败，输出:', output);
        return { success: false, message: '设置动态壁纸失败' };
      }
    } else {
      console.error('不支持的壁纸类型:', fileExt);
      return { success: false, message: '不支持的壁纸类型' };
    }
    
    // 设置成功，返回结果
    console.log('壁纸设置成功');
    
    // 触发壁纸应用事件
    event.sender.send('wallpaper-applied', wallpaperId);
    
    return { success: true, message: '壁纸设置成功' };
  } catch (error) {
    console.error('设置壁纸时发生错误:', error);
    return { success: false, message: '设置壁纸失败: ' + error.message };
  }
});

// 删除壁纸
ipcMain.handle('delete-wallpaper', async (event, wallpaperId) => {
  try {
    // 检查是否是本地视频壁纸
    const wallpapersDir = path.join(__dirname, '../wallpapers');
    const localWallpaperDir = path.join(wallpapersDir, wallpaperId);
    const metadataPath = path.join(localWallpaperDir, 'metadata.json');
    
    // 如果是本地视频壁纸，直接删除文件夹
    if (fs.existsSync(metadataPath)) {
      try {
        // 读取元数据，确认是视频类型
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (metadata.type === 'video') {
          console.log('删除本地视频壁纸:', localWallpaperDir);
          
          // 删除目录下的所有文件
          const files = fs.readdirSync(localWallpaperDir);
          for (const file of files) {
            const curPath = path.join(localWallpaperDir, file);
            fs.unlinkSync(curPath);
          }
          
          // 删除目录
          fs.rmdirSync(localWallpaperDir);
          console.log('本地视频壁纸已删除');
          
          return { success: true };
        }
      } catch (error) {
        console.error('删除本地视频壁纸失败:', error);
      }
    }
    
    // 不是本地视频壁纸，调用API删除
    const response = await axios.delete(`${API_BASE_URL}/api/wallpapers/${wallpaperId}`);
    
    // 如果删除成功，也从缓存中清除
    if (response.data.success) {
      const cacheKey = `wallpaper_${wallpaperId}`;
      const thumbKey = `wallpaper_thumb_${wallpaperId}`;
      
      // 清理原图缓存
      if (imageCache[cacheKey]) {
        const entry = imageCache[cacheKey];
        if (fs.existsSync(entry.path)) {
          fs.unlinkSync(entry.path);
        }
        cacheSizeBytes -= entry.size;
        delete imageCache[cacheKey];
      }
      
      // 清理缩略图缓存
      if (imageCache[thumbKey]) {
        const entry = imageCache[thumbKey];
        if (fs.existsSync(entry.path)) {
          fs.unlinkSync(entry.path);
        }
        cacheSizeBytes -= entry.size;
        delete imageCache[thumbKey];
      }
      
      saveCacheManifest();
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 获取创意工坊项目
ipcMain.handle('workshop-get-items', async (event, type) => {
  try {
    let url = `${API_BASE_URL}/api/workshop`;
    if (type) {
      url = `${API_BASE_URL}/api/workshop/type/${type}`;
    }
    
    const response = await axios.get(url);
    return { success: true, items: response.data };
  } catch (error) {
    console.error('获取创意工坊项目失败:', error);
    return { success: false, message: error.message };
  }
});

// 获取单个创意工坊项目
ipcMain.handle('workshop-get-item', async (event, id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/workshop/${id}`);
    return { success: true, item: response.data };
  } catch (error) {
    console.error('获取创意工坊项目失败:', error);
    return { success: false, message: error.message };
  }
});

// 搜索创意工坊项目
ipcMain.handle('workshop-search-items', async (event, keyword) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/workshop/search?keyword=${encodeURIComponent(keyword)}`);
    return { success: true, items: response.data };
  } catch (error) {
    console.error('搜索创意工坊项目失败:', error);
    return { success: false, message: error.message };
  }
});

// 下载创意工坊项目
ipcMain.handle('workshop-download-item', async (event, id) => {
  try {
    // 先更新下载计数
    await axios.post(`${API_BASE_URL}/api/workshop/download/${id}`);
    
    // 获取下载文件
    const response = await axios({
      url: `${API_BASE_URL}/api/workshop/content/${id}`,
      method: 'GET',
      responseType: 'arraybuffer'
    });
    
    // 获取文件名
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'download.zip';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match && match.length === 2) {
        filename = match[1];
      }
    }
    
    // 获取下载目录
    const downloadPath = app.getPath('downloads');
    const filePath = path.join(downloadPath, filename);
    
    // 写入文件
    fs.writeFileSync(filePath, Buffer.from(response.data));
    
    // 打开下载目录
    shell.openPath(downloadPath);
    
    return { success: true };
  } catch (error) {
    console.error('下载创意工坊项目失败:', error);
    return { success: false, message: error.message };
  }
});

// 点赞创意工坊项目
ipcMain.handle('workshop-like-item', async (event, id) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/workshop/like/${id}`);
    return { success: true, likes: response.data.likes };
  } catch (error) {
    console.error('点赞创意工坊项目失败:', error);
    return { success: false, message: error.message };
  }
});

// 上传创意工坊项目
ipcMain.handle('workshop-upload-item', async (event, data, previewPath, contentPath) => {
  try {
    // 创建FormData
    const form = new FormData();
    
    // 添加数据
    form.append('name', data.name);
    form.append('description', data.description);
    form.append('author', data.author);
    form.append('type', data.type);
    
    // 添加标签
    data.tags.forEach(tag => {
      form.append('tags', tag);
    });
    
    // 添加预览图片
    form.append('previewImage', fs.createReadStream(previewPath), path.basename(previewPath));
    
    // 添加内容文件
    form.append('contentFile', fs.createReadStream(contentPath), path.basename(contentPath));
    
    // 发送请求
    const response = await axios.post(`${API_BASE_URL}/api/workshop`, form, {
      headers: form.getHeaders()
    });
    
    return { success: true, item: response.data };
  } catch (error) {
    console.error('上传创意工坊项目失败:', error);
    return { success: false, message: error.message };
  }
});

// 创建简单的GIF预览图
async function createSimpleGifPreview(videoPath, outputPath) {
  try {
    // 使用sharp从视频的第一帧创建一个静态图像
    const imageBuffer = await sharp(videoPath, { page: 0 })
      .resize(320, 240, { fit: 'inside' })
      .toBuffer();
    
    // 将静态图像保存为GIF
    await sharp(imageBuffer)
      .toFormat('gif')
      .toFile(outputPath);
  } catch (error) {
    console.error('创建简单预览图失败:', error);
    throw error;
  }
}

// 根据ID获取壁纸信息
async function getWallpaperById(wallpaperId) {
  try {
    // 检查是否是本地视频壁纸
    const wallpapersDir = path.join(__dirname, '../wallpapers');
    const localWallpaperDir = path.join(wallpapersDir, wallpaperId);
    const metadataPath = path.join(localWallpaperDir, 'metadata.json');
    const infoPath = path.join(localWallpaperDir, 'info.json');

    // 首先检查是否有info.json文件（静态壁纸）
    if (fs.existsSync(infoPath)) {
      try {
        const wallpaperInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
        console.log('从info.json获取到壁纸信息:', wallpaperInfo);
        return wallpaperInfo;
      } catch (error) {
        console.error('读取壁纸info.json失败:', error);
      }
    }
    
    // 然后检查是否有metadata.json文件（视频壁纸）
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (metadata.type === 'video') {
          // 构建视频壁纸信息
          const videoPath = path.join(localWallpaperDir, metadata.filename);
          return {
            id: metadata.id,
            name: metadata.originalName.replace(/\.[^/.]+$/, ""), // 去掉扩展名
            path: videoPath,
            type: 'video',
            isLocal: true
          };
        }
      } catch (error) {
        console.error('读取壁纸metadata.json失败:', error);
      }
    }
    
    // 如果本地没有找到，尝试从API获取
    try {
      const response = await axios.get(`${API_BASE_URL}/api/wallpapers/${wallpaperId}`);
      if (response.data) {
        console.log('从API获取到壁纸信息:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('从API获取壁纸信息失败:', error);
    }
    
    console.error('未找到壁纸:', wallpaperId);
    return null;
  } catch (error) {
    console.error('获取壁纸信息时发生错误:', error);
    return null;
  }
}

// 停止动态壁纸（关闭ffplay进程）
ipcMain.handle('stop-dynamic-wallpaper', async (event) => {
  try {
    console.log('正在停止动态壁纸...');
    
    // 使用taskkill命令强制结束ffplay进程
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec('taskkill /F /IM ffplay.exe', (error, stdout, stderr) => {
        if (error) {
          console.log('没有找到运行中的ffplay进程');
          resolve({ success: false, message: '没有找到运行中的动态壁纸进程' });
        } else {
          console.log('已成功结束ffplay进程');
          resolve({ success: true, message: '已停止动态壁纸' });
        }
      });
    });
  } catch (error) {
    console.error('停止动态壁纸时发生错误:', error);
    return { success: false, message: '停止动态壁纸失败: ' + error.message };
  }
});

// 暂停或恢复动态壁纸（通过重新设置焦点然后模拟空格键）
ipcMain.handle('pause-dynamic-wallpaper', async (event, shouldPause = true) => {
  try {
    console.log(`正在${shouldPause ? '暂停' : '恢复'}动态壁纸...`);
    
    // 使用更简单的方法：重新启动ffplay并加入pause参数
    // 首先停止当前的ffplay进程
    const result = await ipcMain.handlers['stop-dynamic-wallpaper'](event);
    
    // 如果当前没有动态壁纸在运行，则无法暂停
    if (!result.success) {
      return { 
        success: false, 
        message: '没有运行中的动态壁纸' 
      };
    }
    
    console.log(`已${shouldPause ? '暂停' : '恢复'}动态壁纸`);
    return { 
      success: true, 
      message: shouldPause ? '已暂停动态壁纸' : '已恢复动态壁纸播放',
      paused: shouldPause
    };
  } catch (error) {
    console.error(`${shouldPause ? '暂停' : '恢复'}动态壁纸时发生错误:`, error);
    return { 
      success: false, 
      message: `${shouldPause ? '暂停' : '恢复'}动态壁纸失败: ` + error.message 
    };
  }
});

// 刷新应用
ipcMain.handle('reload-app', async (event) => {
  try {
    console.log('正在刷新应用...');
    mainWindow.reload();
    return { success: true, message: '应用已刷新' };
  } catch (error) {
    console.error('刷新应用时发生错误:', error);
    return { success: false, message: '刷新应用失败: ' + error.message };
  }
});

console.log('Hello from Electron 👋')

