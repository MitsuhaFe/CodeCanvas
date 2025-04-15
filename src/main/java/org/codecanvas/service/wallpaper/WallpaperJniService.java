package org.codecanvas.service.wallpaper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.CompletableFuture;

/**
 * 壁纸JNI服务，用于调用本地C++程序设置壁纸
 */
@Service
public class WallpaperJniService {
    private static final Logger logger = LoggerFactory.getLogger(WallpaperJniService.class);
    
    // 二进制文件路径
    private final String staticWallpaperPath;
    private final String dynamicWallpaperPath;
    private final String ffplayPath;
    
    /**
     * 构造函数，初始化二进制文件路径
     */
    public WallpaperJniService() {
        // 获取应用根目录
        String rootPath = System.getProperty("user.dir");
        // 设置二进制文件路径
        staticWallpaperPath = Paths.get(rootPath, "my-electron-app", "bin", "StaticWallPaper.exe").toString();
        dynamicWallpaperPath = Paths.get(rootPath, "my-electron-app", "bin", "WallPaperCore.exe").toString();
        ffplayPath = Paths.get(rootPath, "my-electron-app", "bin", "ffmpeg", "bin", "ffplay.exe").toString();
        
        // 检查二进制文件是否存在，如果不存在则尝试编译
        checkAndCompileBinaries();
    }
    
    /**
     * 检查并编译二进制文件
     */
    private void checkAndCompileBinaries() {
        Path staticWallpaperFile = Paths.get(staticWallpaperPath);
        Path dynamicWallpaperFile = Paths.get(dynamicWallpaperPath);
        Path ffplayFile = Paths.get(ffplayPath);
        
        logger.info("检查二进制文件是否存在");
        logger.info("静态壁纸程序路径: {}", staticWallpaperFile);
        logger.info("动态壁纸程序路径: {}", dynamicWallpaperFile);
        logger.info("FFPlay路径: {}", ffplayFile);
        
        // 检查FFPlay是否存在
        if (!Files.exists(ffplayFile)) {
            logger.error("FFPlay不存在! 路径: {}", ffplayFile);
        }
        
        // 检查二进制文件是否需要编译
        if (!Files.exists(staticWallpaperFile) || !Files.exists(dynamicWallpaperFile)) {
            logger.info("二进制文件不存在，尝试编译");
            
            // 获取编译脚本路径
            String compileBatPath = Paths.get(
                    System.getProperty("user.dir"), 
                    "my-electron-app", 
                    "bin", 
                    "compile.bat"
            ).toString();
            
            try {
                // 启动编译脚本
                Process process = Runtime.getRuntime().exec(compileBatPath);
                int exitCode = process.waitFor();
                
                if (exitCode == 0) {
                    logger.info("编译成功");
                } else {
                    logger.error("编译失败，退出代码: {}", exitCode);
                }
            } catch (IOException | InterruptedException e) {
                logger.error("编译过程发生错误", e);
            }
        }
    }
    
    /**
     * 设置静态壁纸
     * @param wallpaperPath 壁纸文件路径
     * @return 是否设置成功
     */
    public boolean setStaticWallpaper(String wallpaperPath) {
        logger.info("设置静态壁纸: {}", wallpaperPath);
        
        // 检查文件是否存在
        File wallpaperFile = new File(wallpaperPath);
        if (!wallpaperFile.exists()) {
            logger.error("壁纸文件不存在: {}", wallpaperPath);
            return false;
        }
        
        try {
            // 构建命令
            ProcessBuilder pb = new ProcessBuilder(staticWallpaperPath, wallpaperPath);
            pb.redirectErrorStream(true);
            
            // 启动进程
            Process process = pb.start();
            
            // 异步读取输出
            CompletableFuture.runAsync(() -> {
                try {
                    byte[] buffer = new byte[1024];
                    int len;
                    while ((len = process.getInputStream().read(buffer)) != -1) {
                        logger.info(new String(buffer, 0, len));
                    }
                } catch (IOException e) {
                    logger.error("读取进程输出出错", e);
                }
            });
            
            // 等待进程结束
            int exitCode = process.waitFor();
            
            if (exitCode == 0) {
                logger.info("静态壁纸设置成功");
                return true;
            } else {
                logger.error("静态壁纸设置失败，退出代码: {}", exitCode);
                return false;
            }
        } catch (IOException | InterruptedException e) {
            logger.error("设置静态壁纸时发生错误", e);
            return false;
        }
    }
    
    /**
     * 设置动态壁纸
     * @param videoPath 视频文件路径
     * @return 是否设置成功
     */
    public boolean setDynamicWallpaper(String videoPath) {
        logger.info("设置动态壁纸: {}", videoPath);
        
        // 检查文件是否存在
        File videoFile = new File(videoPath);
        if (!videoFile.exists()) {
            logger.error("视频文件不存在: {}", videoPath);
            return false;
        }
        
        try {
            // 构建命令
            ProcessBuilder pb = new ProcessBuilder(dynamicWallpaperPath, videoPath);
            pb.redirectErrorStream(true);
            
            // 启动进程
            Process process = pb.start();
            
            // 异步读取输出
            CompletableFuture.runAsync(() -> {
                try {
                    byte[] buffer = new byte[1024];
                    int len;
                    while ((len = process.getInputStream().read(buffer)) != -1) {
                        logger.info(new String(buffer, 0, len));
                    }
                } catch (IOException e) {
                    logger.error("读取进程输出出错", e);
                }
            });
            
            // 等待进程结束
            int exitCode = process.waitFor();
            
            if (exitCode == 0) {
                logger.info("动态壁纸设置成功");
                return true;
            } else {
                logger.error("动态壁纸设置失败，退出代码: {}", exitCode);
                return false;
            }
        } catch (IOException | InterruptedException e) {
            logger.error("设置动态壁纸时发生错误", e);
            return false;
        }
    }
    
    /**
     * 根据文件类型设置壁纸
     * @param filePath 文件路径
     * @return 是否设置成功
     */
    public boolean setWallpaper(String filePath) {
        logger.info("根据文件类型设置壁纸: {}", filePath);
        
        // 检查文件是否存在
        File file = new File(filePath);
        if (!file.exists()) {
            logger.error("文件不存在: {}", filePath);
            return false;
        }
        
        // 获取文件扩展名
        String extension = getFileExtension(filePath).toLowerCase();
        
        // 判断文件类型
        if (isVideoFile(extension)) {
            // 视频文件，使用动态壁纸程序
            return setDynamicWallpaper(filePath);
        } else {
            // 图片文件，使用静态壁纸程序
            return setStaticWallpaper(filePath);
        }
    }
    
    /**
     * 获取文件扩展名
     * @param filePath 文件路径
     * @return 文件扩展名
     */
    private String getFileExtension(String filePath) {
        int lastDotIndex = filePath.lastIndexOf(".");
        if (lastDotIndex > 0) {
            return filePath.substring(lastDotIndex + 1);
        }
        return "";
    }
    
    /**
     * 判断是否为视频文件
     * @param extension 文件扩展名
     * @return 是否为视频文件
     */
    private boolean isVideoFile(String extension) {
        return extension.equals("mp4") || 
               extension.equals("avi") || 
               extension.equals("mkv") || 
               extension.equals("mov") || 
               extension.equals("wmv") || 
               extension.equals("flv");
    }
} 