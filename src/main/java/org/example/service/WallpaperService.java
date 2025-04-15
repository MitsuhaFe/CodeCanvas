package org.example.service;

import org.example.model.Wallpaper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.awt.image.BufferedImage;
import java.awt.Graphics2D;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.RenderingHints;
import javax.imageio.ImageIO;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.util.concurrent.TimeUnit;

/**
 * 壁纸服务类
 */
@Service
public class WallpaperService {
    private static final Logger logger = LoggerFactory.getLogger(WallpaperService.class);
    
    @Value("${app.wallpaper.storage-path:./wallpapers}")
    private String storagePath;
    
    @Value("${app.wallpaper.cache-size:100}")
    private int maxCacheSize; // 最大缓存条目数
    
    @Value("${wallpaper.staticWallpaper.executablePath:${user.dir}/src/main/CPP/StaticWallPaper/bin/StaticWallPaper.exe}")
    private String staticWallpaperExecutablePath;
    
    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule()); // 注册JavaTimeModule以支持Java 8日期时间类型
    
    // 模拟数据库，实际项目中应该使用数据库存储
    private final Map<String, Wallpaper> wallpaperMap = new ConcurrentHashMap<>();
    
    // 图片缓存 - 使用LinkedHashMap实现LRU缓存
    private final Map<String, BufferedImage> imageCache = new LinkedHashMap<String, BufferedImage>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, BufferedImage> eldest) {
            return size() > maxCacheSize;
        }
    };
    
    // 线程池用于后台处理图片
    private final ExecutorService imageProcessorPool = Executors.newFixedThreadPool(
        Math.max(2, Runtime.getRuntime().availableProcessors() / 2)
    );
    
    /**
     * 构造函数
     */
    public WallpaperService() {
        // 空构造函数，不进行任何初始化操作
    }
    
    /**
     * 初始化方法，在所有属性设置完成后执行
     */
    @PostConstruct
    public void init() {
        try {
            // 确保主存储目录存在
            Path path = Paths.get(storagePath);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
            }
            
            // 加载已存在的壁纸信息
            loadExistingWallpapers();
            
        } catch (IOException e) {
            throw new RuntimeException("无法创建壁纸存储目录", e);
        }
    }
    
    /**
     * 加载已存在的壁纸信息
     */
    private void loadExistingWallpapers() {
        try {
            Path rootPath = Paths.get(storagePath);
            if (!Files.exists(rootPath)) {
                return;
            }
            
            // 遍历wallpapers目录下的所有子目录（每个子目录是一个壁纸）
            Files.list(rootPath)
                .filter(Files::isDirectory)
                .forEach(wallpaperDir -> {
                    try {
                        // 检查info.json是否存在
                        Path infoPath = wallpaperDir.resolve("info.json");
                        if (Files.exists(infoPath)) {
                            // 从JSON读取壁纸信息
                            Wallpaper wallpaper = objectMapper.readValue(infoPath.toFile(), Wallpaper.class);
                            wallpaperMap.put(wallpaper.getId(), wallpaper);
                            System.out.println("加载壁纸: " + wallpaper.getName() + " (ID: " + wallpaper.getId() + ")");
                        }
        } catch (Exception e) {
                        System.err.println("加载壁纸目录失败: " + wallpaperDir + " - " + e.getMessage());
                    }
                });
            
            System.out.println("已加载 " + wallpaperMap.size() + " 个壁纸");
        } catch (IOException e) {
            System.err.println("加载现有壁纸失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取所有壁纸，带分页功能
     * 
     * @param page 页码，从0开始
     * @param size 每页大小
     * @return 壁纸列表
     */
    public List<Wallpaper> getWallpapers(int page, int size) {
        if (page < 0 || size <= 0) {
            return new ArrayList<>();
        }
        
        // 计算分页
        int from = page * size;
        
        // 获取所有壁纸并排序（按上传时间倒序）
        return wallpaperMap.values().stream()
            .sorted(Comparator.comparing(Wallpaper::getCreatedAt).reversed())
            .skip(from)
            .limit(size)
            .collect(Collectors.toList());
    }
    
    /**
     * 获取所有壁纸（无分页）
     */
    public List<Wallpaper> getAllWallpapers() {
        // 按上传时间倒序排序
        return wallpaperMap.values().stream()
            .sorted(Comparator.comparing(Wallpaper::getCreatedAt).reversed())
            .collect(Collectors.toList());
    }
    
    /**
     * 获取壁纸总数
     */
    public int getTotalWallpapers() {
        return wallpaperMap.size();
    }
    
    /**
     * 根据ID获取壁纸
     * 
     * @param id 壁纸ID
     * @return 壁纸对象
     */
    public Wallpaper getWallpaperById(String id) {
        return wallpaperMap.get(id);
    }
    
    /**
     * 上传壁纸
     * 
     * @param file 壁纸文件
     * @return 新创建的壁纸对象
     * @throws IOException 如果文件处理出错
     */
    public Wallpaper uploadWallpaper(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        
        // 获取原始文件名和扩展名
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new IllegalArgumentException("文件名不能为空");
        }
        
        String fileExtension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFilename.substring(dotIndex);
        }
        
        // 创建壁纸对象并生成唯一ID
        String wallpaperId = UUID.randomUUID().toString();
        Wallpaper wallpaper = new Wallpaper();
        wallpaper.setId(wallpaperId);
        wallpaper.setName(originalFilename.substring(0, dotIndex > 0 ? dotIndex : originalFilename.length()));
        
        // 创建壁纸目录
        Path wallpaperDir = Paths.get(storagePath, wallpaperId);
        Files.createDirectories(wallpaperDir);
        
        // 存储原始图片
        String originalFileName = "original" + fileExtension;
        Path originalPath = wallpaperDir.resolve(originalFileName);
        Files.copy(file.getInputStream(), originalPath);
        wallpaper.setPath(originalPath.toString());
        
        // 设置URL（相对路径）
        String originalUrl = "/api/wallpapers/files/" + wallpaperId + "/" + originalFileName;
        wallpaper.setUrl(originalUrl);
        
        // 创建并保存缩略图
        String thumbnailFileName = "thumbnail" + fileExtension;
        Path thumbnailPath = wallpaperDir.resolve(thumbnailFileName);
        createThumbnail(originalPath.toFile(), thumbnailPath.toFile());
        
        // 设置缩略图URL
        String thumbnailUrl = "/api/wallpapers/files/" + wallpaperId + "/" + thumbnailFileName;
        wallpaper.setThumbnailUrl(thumbnailUrl);
        
        // 保存壁纸信息到JSON
        saveWallpaperInfo(wallpaper, wallpaperDir);
        
        // 保存到映射表中
        wallpaperMap.put(wallpaper.getId(), wallpaper);
        
        return wallpaper;
    }
    
    /**
     * 保存壁纸信息到JSON文件
     */
    private void saveWallpaperInfo(Wallpaper wallpaper, Path wallpaperDir) throws IOException {
        Path infoPath = wallpaperDir.resolve("info.json");
        objectMapper.writeValue(infoPath.toFile(), wallpaper);
    }
    
    /**
     * 创建壁纸缩略图
     */
    private void createThumbnail(File sourceFile, File targetFile) throws IOException {
        // 读取原始图片
        BufferedImage sourceImage = ImageIO.read(sourceFile);
        if (sourceImage == null) {
            throw new IOException("无法读取图片: " + sourceFile.getPath());
        }
        
        // 计算缩略图尺寸（保持宽高比）
        int thumbWidth = 320;
        int thumbHeight = thumbWidth * sourceImage.getHeight() / sourceImage.getWidth();
        
        // 创建缩略图
        BufferedImage thumbnail = new BufferedImage(thumbWidth, thumbHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = thumbnail.createGraphics();
        
        // 设置高质量缩放
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        
        g2d.drawImage(sourceImage, 0, 0, thumbWidth, thumbHeight, null);
        g2d.dispose();
        
        // 保存缩略图
        String extension = getFileExtension(targetFile.getName());
        ImageIO.write(thumbnail, extension.isEmpty() ? "jpg" : extension, targetFile);
    }
    
    /**
     * 获取文件扩展名
     */
    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < filename.length() - 1) {
            return filename.substring(dotIndex + 1).toLowerCase();
        }
        return "";
    }
    
    /**
     * 删除壁纸
     * 
     * @param id 壁纸ID
     * @return 是否删除成功
     */
    public boolean deleteWallpaper(String id) {
        Wallpaper wallpaper = wallpaperMap.get(id);
        if (wallpaper == null) {
            return false;
        }
        
        try {
            // 删除整个壁纸目录
            Path wallpaperDir = Paths.get(storagePath, id);
            if (Files.exists(wallpaperDir)) {
                Files.walk(wallpaperDir)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            }
            
            // 从缓存中移除
            synchronized (imageCache) {
                imageCache.remove(id);
        }
        
        // 从映射表中移除
        wallpaperMap.remove(id);
        
        return true;
        } catch (IOException e) {
            System.err.println("删除壁纸目录失败: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * 获取壁纸文件
     * 
     * @param wallpaperId 壁纸ID
     * @param fileName 文件名
     * @return 文件对象
     */
    public File getWallpaperFile(String wallpaperId, String fileName) {
        Path filePath = Paths.get(storagePath, wallpaperId, fileName);
        File file = filePath.toFile();
        
        if (file.exists() && file.isFile()) {
            return file;
        }
        
        return null;
    }
    
    /**
     * 关闭服务
     */
    public void shutdown() {
        imageProcessorPool.shutdown();
    }
    
    /**
     * 获取壁纸缩略图文件
     * 
     * @param fileName 文件名
     * @return 缩略图文件对象
     */
    public File getThumbnailFile(String fileName) {
        // 解析文件名以获取壁纸ID
        String wallpaperId = getWallpaperIdFromFileName(fileName);
        if (wallpaperId == null) {
            return null;
        }
        
        // 构建缩略图路径
        Path thumbnailPath = Paths.get(storagePath, wallpaperId, "thumbnail" + getFileExtension(fileName, ".jpg"));
        File thumbnailFile = thumbnailPath.toFile();
        
        if (thumbnailFile.exists() && thumbnailFile.isFile()) {
            return thumbnailFile;
        }
        
        return null;
    }
    
    /**
     * 从文件名中提取壁纸ID
     * 
     * @param fileName 文件名
     * @return 壁纸ID或null
     */
    private String getWallpaperIdFromFileName(String fileName) {
        // 假设文件名格式为：{wallpaperId}_thumbnail.jpg
        // 或者其他包含壁纸ID的格式
        int underscoreIndex = fileName.indexOf('_');
        if (underscoreIndex > 0) {
            return fileName.substring(0, underscoreIndex);
        }
        
        // 如果文件名不符合预期格式，尝试查找与文件名匹配的壁纸
        for (Wallpaper wallpaper : wallpaperMap.values()) {
            if (fileName.startsWith(wallpaper.getId())) {
                return wallpaper.getId();
            }
        }
        
        return null;
    }
    
    /**
     * 获取文件扩展名，带点号
     * 
     * @param fileName 文件名
     * @param defaultExt 默认扩展名（如果没有找到）
     * @return 带点号的扩展名
     */
    private String getFileExtension(String fileName, String defaultExt) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < fileName.length() - 1) {
            return "." + fileName.substring(dotIndex + 1).toLowerCase();
        }
        return defaultExt;
    }
    
    /**
     * 设置静态壁纸
     * @param imagePath 壁纸图片的完整路径
     * @return 设置是否成功
     */
    public boolean setStaticWallpaper(String imagePath) {
        logger.info("设置静态壁纸: {}", imagePath);
        
        // 检查文件是否存在
        File imageFile = new File(imagePath);
        if (!imageFile.exists() || !imageFile.isFile()) {
            logger.error("壁纸文件不存在: {}", imagePath);
            return false;
        }
        
        // 检查可执行文件是否存在
        File executableFile = new File(staticWallpaperExecutablePath);
        if (!executableFile.exists()) {
            logger.error("壁纸设置程序不存在: {}", staticWallpaperExecutablePath);
            return false;
        }
        
        try {
            // 构建命令
            ProcessBuilder processBuilder = new ProcessBuilder(
                staticWallpaperExecutablePath,
                imagePath
            );
            
            // 合并错误和标准输出
            processBuilder.redirectErrorStream(true);
            
            // 启动进程
            Process process = processBuilder.start();
            
            // 等待进程完成，最多等待5秒
            boolean completed = process.waitFor(5, TimeUnit.SECONDS);
            
            if (!completed) {
                logger.error("壁纸设置超时");
                process.destroyForcibly();
                return false;
            }
            
            int exitValue = process.exitValue();
            if (exitValue == 0) {
                logger.info("壁纸设置成功");
                return true;
            } else {
                logger.error("壁纸设置失败，退出代码: {}", exitValue);
                return false;
            }
        } catch (IOException | InterruptedException e) {
            logger.error("设置壁纸时发生错误", e);
            return false;
        }
    }
    
    /**
     * 判断壁纸类型
     * @param filePath 壁纸文件路径
     * @return 是否为静态壁纸
     */
    public boolean isStaticWallpaper(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return false;
        }
        
        // 获取文件扩展名
        String extension = getFileExtension(filePath).toLowerCase();
        
        // 静态壁纸扩展名列表
        return extension.equals("jpg") || 
               extension.equals("jpeg") ||
               extension.equals("png") ||
               extension.equals("bmp");
    }
    
    /**
     * 获取壁纸文件的绝对路径
     * 
     * @param wallpaperId 壁纸ID
     * @return 壁纸文件的绝对路径
     */
    public String getWallpaperFilePath(String wallpaperId) {
        Wallpaper wallpaper = getWallpaperById(wallpaperId);
        if (wallpaper == null) {
            return null;
        }
        
        // 构建壁纸文件路径
        Path wallpaperDir = Paths.get(storagePath, wallpaperId);
        Path originalPath = wallpaperDir.resolve("original" + getFileExtension(wallpaper.getPath(), ".jpg"));
        
        return originalPath.toAbsolutePath().toString();
    }
} 