package org.codecanvas.service.wallpaper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 壁纸控制器，提供壁纸相关API
 */
@RestController
@RequestMapping("/api/wallpapers")
public class WallpaperController {
    private static final Logger logger = LoggerFactory.getLogger(WallpaperController.class);
    
    private final WallpaperService wallpaperService;
    
    @Autowired
    public WallpaperController(WallpaperService wallpaperService) {
        this.wallpaperService = wallpaperService;
    }
    
    /**
     * 设置壁纸
     * @param wallpaperId 壁纸ID
     * @param wallpaperPath 壁纸路径
     * @return 设置结果
     */
    @PostMapping("/{wallpaperId}/set")
    public ResponseEntity<Map<String, Object>> setWallpaper(
            @PathVariable String wallpaperId,
            @RequestParam String wallpaperPath) {
        
        logger.info("收到设置壁纸请求: ID={}, 路径={}", wallpaperId, wallpaperPath);
        
        Map<String, Object> response = new HashMap<>();
        
        boolean result = wallpaperService.setWallpaper(wallpaperId, wallpaperPath);
        
        response.put("success", result);
        if (result) {
            response.put("message", "壁纸设置成功");
        } else {
            response.put("message", "壁纸设置失败");
        }
        
        return ResponseEntity.ok(response);
    }
} 