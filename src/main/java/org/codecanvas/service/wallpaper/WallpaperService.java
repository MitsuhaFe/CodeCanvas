package org.codecanvas.service.wallpaper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 壁纸服务类，提供壁纸相关功能
 */
@Service
public class WallpaperService {
    private static final Logger logger = LoggerFactory.getLogger(WallpaperService.class);
    
    private final WallpaperJniService wallpaperJniService;
    
    @Autowired
    public WallpaperService(WallpaperJniService wallpaperJniService) {
        this.wallpaperJniService = wallpaperJniService;
    }
    
    /**
     * 设置壁纸
     * @param wallpaperId 壁纸ID
     * @param wallpaperPath 壁纸文件路径
     * @return 设置是否成功
     */
    public boolean setWallpaper(String wallpaperId, String wallpaperPath) {
        logger.info("设置壁纸: ID={}, 路径={}", wallpaperId, wallpaperPath);
        
        // 使用JNI服务设置壁纸
        return wallpaperJniService.setWallpaper(wallpaperPath);
    }
} 