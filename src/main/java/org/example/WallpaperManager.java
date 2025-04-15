package org.example;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 壁纸管理器类，用于调用C++程序设置动态壁纸
 */
public class WallpaperManager {
    
    /**
     * 设置视频作为桌面壁纸
     * @param videoPath 视频文件路径
     * @param width 视频宽度
     * @param height 视频高度
     * @return 是否成功设置壁纸
     */
    public static boolean setVideoAsWallpaper(String videoPath, int width, int height) {
        try {
            // 获取C++可执行文件的路径
            String executablePath = getExecutablePath();
            
            // 构建命令
            ProcessBuilder processBuilder = new ProcessBuilder(
                executablePath,
                videoPath,
                "-noborder",
                "-x", String.valueOf(width),
                "-y", String.valueOf(height),
                "-loop", "0"
            );
            
            // 启动进程
            Process process = processBuilder.start();
            
            // 等待进程完成
            int exitCode = process.waitFor();
            
            return exitCode == 0;
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * 获取C++可执行文件的路径
     * @return 可执行文件路径
     */
    private static String getExecutablePath() {
        // 获取项目根目录
        String projectDir = System.getProperty("user.dir");
        
        // 构建可执行文件路径
        // 注意：这里假设C++程序编译后的名称为wallpaperCore
        // 在Windows上，可执行文件扩展名为.exe
        String osName = System.getProperty("os.name").toLowerCase();
        String executableName = osName.contains("windows") ? "wallpaperCore.exe" : "wallpaperCore";
        
        // 构建完整路径
        Path executablePath = Paths.get(projectDir, "build", "exe", "wallpaperCore", executableName);
        
        return executablePath.toString();
    }
    
    /**
     * 主方法，用于测试
     */
    public static void main(String[] args) {
        // 测试设置视频壁纸
        String videoPath = "D:\\Downloads\\video.mp4";
        boolean success = setVideoAsWallpaper(videoPath, 2560, 1440);
        
        if (success) {
            System.out.println("成功设置视频壁纸");
        } else {
            System.out.println("设置视频壁纸失败");
        }
    }
} 