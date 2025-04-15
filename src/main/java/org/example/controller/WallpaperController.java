package org.example.controller;

import org.example.model.Wallpaper;
import org.example.service.WallpaperService;
import org.example.util.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 壁纸控制器
 */
@RestController
@RequestMapping("/api/wallpapers")
@CrossOrigin // 允许跨域请求
public class WallpaperController {
    private static final Logger logger = LoggerFactory.getLogger(WallpaperController.class);
    
    private final WallpaperService wallpaperService;
    
    @Autowired
    public WallpaperController(WallpaperService wallpaperService) {
        this.wallpaperService = wallpaperService;
    }
    
    /**
     * 获取所有壁纸（支持分页）
     * 
     * @param page 页码（从0开始）
     * @param size 每页数量
     * @return 壁纸列表
     */
    @GetMapping
    public ResponseEntity<Object> getWallpapers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        // 参数验证
        if (page < 0 || size <= 0 || size > 100) {
            return ResponseEntity.badRequest().body("无效的分页参数");
        }
        
        // 获取分页数据
        List<Wallpaper> wallpapers = wallpaperService.getWallpapers(page, size);
        
        // 添加分页信息和总数
        Map<String, Object> response = new HashMap<>();
        response.put("wallpapers", wallpapers);
        response.put("page", page);
        response.put("size", size);
        response.put("total", wallpaperService.getTotalWallpapers());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 获取所有壁纸（无分页，向下兼容）
     * 
     * @return 壁纸列表
     */
    @GetMapping("/all")
    public ResponseEntity<List<Wallpaper>> getAllWallpapers() {
        List<Wallpaper> wallpapers = wallpaperService.getAllWallpapers();
        return ResponseEntity.ok(wallpapers);
    }
    
    /**
     * 根据ID获取壁纸
     * 
     * @param id 壁纸ID
     * @return 壁纸对象
     */
    @GetMapping("/{id}")
    public ResponseEntity<Wallpaper> getWallpaperById(@PathVariable String id) {
        Wallpaper wallpaper = wallpaperService.getWallpaperById(id);
        if (wallpaper == null) {
            return ResponseEntity.notFound().build();
        }
        
        // 添加调试信息
        System.out.println("获取壁纸ID: " + id);
        System.out.println("壁纸路径: " + wallpaper.getPath());
        
        // 检查文件是否存在
        File file = new File(wallpaper.getPath());
        if (!file.exists()) {
            System.out.println("警告: 壁纸文件不存在 - " + wallpaper.getPath());
        } else {
            System.out.println("壁纸文件存在，长度: " + file.length() + " 字节");
        }
        
        return ResponseEntity.ok(wallpaper);
    }
    
    /**
     * 上传壁纸
     * 
     * @param file 壁纸文件
     * @return 上传结果
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadWallpaper(@RequestParam("file") MultipartFile file) {
        try {
            Wallpaper wallpaper = wallpaperService.uploadWallpaper(file);
            return ResponseEntity.ok(wallpaper);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("上传文件失败: " + e.getMessage());
        }
    }
    
    /**
     * 删除壁纸
     * 
     * @param id 壁纸ID
     * @return 删除结果
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWallpaper(@PathVariable String id) {
        boolean success = wallpaperService.deleteWallpaper(id);
        if (success) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * 获取壁纸文件（新结构 - 文件夹形式）
     */
    @GetMapping("/files/{wallpaperId}/{fileName:.+}")
    public ResponseEntity<Resource> getWallpaperFileById(
            @PathVariable String wallpaperId,
            @PathVariable String fileName) {
        File file = wallpaperService.getWallpaperFile(wallpaperId, fileName);
        if (file == null || !file.exists()) {
            return ResponseEntity.notFound().build();
        }
        
        // 确定文件的MIME类型
        String contentType = determineContentType(fileName);
        
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS)) // 缓存30天
                .body(resource);
    }
    
    /**
     * 获取壁纸缩略图文件
     */
    @GetMapping("/thumbnails/{fileName:.+}")
    public ResponseEntity<Resource> getThumbnailFile(@PathVariable String fileName) {
        File file = wallpaperService.getThumbnailFile(fileName);
        if (file == null || !file.exists()) {
            return ResponseEntity.notFound().build();
        }
        
        // 确定文件的MIME类型
        String contentType = determineContentType(fileName);
        
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .cacheControl(CacheControl.maxAge(60, TimeUnit.DAYS)) // 缩略图缓存更长时间
                .body(resource);
    }
    
    /**
     * 确定文件的MIME类型
     */
    private String determineContentType(String fileName) {
        String fileName_lower = fileName.toLowerCase();
        if (fileName_lower.endsWith(".jpg") || fileName_lower.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG_VALUE;
        } else if (fileName_lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG_VALUE;
        } else if (fileName_lower.endsWith(".gif")) {
            return MediaType.IMAGE_GIF_VALUE;
        } else if (fileName_lower.endsWith(".webp")) {
            return "image/webp";
        } else if (fileName_lower.endsWith(".bmp")) {
            return "image/bmp";
        } else {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
    }

    @PostMapping("/wallpapers/{id}/apply")
    public ResponseEntity<?> applyWallpaper(@PathVariable("id") String id) {
        logger.info("应用壁纸: {}", id);
        try {
            Wallpaper wallpaper = wallpaperService.getWallpaperById(id);
            if (wallpaper == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("壁纸不存在"));
            }
            
            // 获取壁纸文件绝对路径
            String wallpaperPath = wallpaperService.getWallpaperFilePath(id);
            File wallpaperFile = new File(wallpaperPath);
            if (!wallpaperFile.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("壁纸文件不存在"));
            }
            
            boolean success = false;
            
            // 根据壁纸类型调用不同的设置方法
            if (wallpaperService.isStaticWallpaper(wallpaperPath)) {
                // 静态壁纸使用C++程序设置
                logger.info("设置静态壁纸: {}", wallpaperPath);
                success = wallpaperService.setStaticWallpaper(wallpaperPath);
            } else {
                // 动态壁纸使用其他方法设置，这里略过
                logger.info("非静态壁纸，无法设置: {}", wallpaperPath);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("不支持的壁纸类型"));
            }
            
            if (success) {
                return ResponseEntity.ok(ApiResponse.success("壁纸设置成功"));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("壁纸设置失败"));
            }
        } catch (Exception e) {
            logger.error("应用壁纸时发生错误", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("应用壁纸失败: " + e.getMessage()));
        }
    }
} 