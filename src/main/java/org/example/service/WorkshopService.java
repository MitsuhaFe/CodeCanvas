package org.example.service;

import org.example.model.Workshop;
import org.example.util.DemoImageGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 创意工坊服务类
 */
@Service
public class WorkshopService {
    
    @Value("${app.workshop.storage-path:./workshop}")
    private String storagePath;
    
    // 模拟数据库，实际项目中应该使用数据库存储
    private final Map<String, Workshop> workshopMap = new HashMap<>();
    
    /**
     * 构造函数
     */
    public WorkshopService() {
        // 空构造函数，不进行任何初始化操作
    }
    
    /**
     * 初始化存储目录和演示数据
     */
    @PostConstruct
    public void init() {
        try {
            Path path = Paths.get(storagePath);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
            }
            
            // 添加一些初始数据用于演示
            addDemoItems();
        } catch (IOException e) {
            throw new RuntimeException("无法创建创意工坊存储目录", e);
        }
    }
    
    /**
     * 添加演示数据
     */
    private void addDemoItems() {
        try {
            // 壁纸类型
            Workshop wallpaper1 = new Workshop();
            wallpaper1.setName("动态星空壁纸");
            wallpaper1.setDescription("一款绚丽的动态星空壁纸，支持随鼠标移动产生交互效果，为您的桌面增添梦幻色彩。");
            wallpaper1.setAuthor("星辰设计");
            wallpaper1.setType("wallpaper");
            wallpaper1.setTags(new String[]{"星空", "动态", "交互"});
            
            // 生成预览图片
            String previewFileName = "starry-sky.jpg";
            DemoImageGenerator.generateDemoImage(
                wallpaper1.getType(), 
                wallpaper1.getName(), 
                storagePath, 
                previewFileName
            );
            
            wallpaper1.setPreviewImageUrl("/api/workshop/preview/" + previewFileName);
            wallpaper1.setDownloadUrl("/api/workshop/download/" + wallpaper1.getId());
            wallpaper1.setDownloads(128);
            wallpaper1.setLikes(76);
            workshopMap.put(wallpaper1.getId(), wallpaper1);
            
            Workshop wallpaper2 = new Workshop();
            wallpaper2.setName("春日樱花");
            wallpaper2.setDescription("梦幻樱花飘落效果，给您带来春天的气息。樱花随风飘落，为您的桌面增添浪漫氛围。");
            wallpaper2.setAuthor("日系风格");
            wallpaper2.setType("wallpaper");
            wallpaper2.setTags(new String[]{"樱花", "动态", "春天"});
            
            // 生成预览图片
            previewFileName = "cherry-blossom.jpg";
            DemoImageGenerator.generateDemoImage(
                wallpaper2.getType(), 
                wallpaper2.getName(), 
                storagePath, 
                previewFileName
            );
            
            wallpaper2.setPreviewImageUrl("/api/workshop/preview/" + previewFileName);
            wallpaper2.setDownloadUrl("/api/workshop/download/" + wallpaper2.getId());
            wallpaper2.setDownloads(97);
            wallpaper2.setLikes(63);
            workshopMap.put(wallpaper2.getId(), wallpaper2);
            
            // 小组件类型
            Workshop widget1 = new Workshop();
            widget1.setName("系统监控小组件");
            widget1.setDescription("显示CPU、内存、网络等系统资源使用情况，支持自定义颜色和显示项，帮助您实时监控系统性能。");
            widget1.setAuthor("性能监控团队");
            widget1.setType("widget");
            widget1.setTags(new String[]{"系统", "监控", "性能"});
            
            // 生成预览图片
            previewFileName = "system-monitor.jpg";
            DemoImageGenerator.generateDemoImage(
                widget1.getType(), 
                widget1.getName(), 
                storagePath, 
                previewFileName
            );
            
            widget1.setPreviewImageUrl("/api/workshop/preview/" + previewFileName);
            widget1.setDownloadUrl("/api/workshop/download/" + widget1.getId());
            widget1.setDownloads(85);
            widget1.setLikes(42);
            workshopMap.put(widget1.getId(), widget1);
            
            Workshop widget2 = new Workshop();
            widget2.setName("天气时钟组件");
            widget2.setDescription("集成天气预报和时钟功能，支持多城市切换，显示未来三天天气预报，美观实用。");
            widget2.setAuthor("气象爱好者");
            widget2.setType("widget");
            widget2.setTags(new String[]{"天气", "时钟", "预报"});
            
            // 生成预览图片
            previewFileName = "weather-clock.jpg";
            DemoImageGenerator.generateDemoImage(
                widget2.getType(), 
                widget2.getName(), 
                storagePath, 
                previewFileName
            );
            
            widget2.setPreviewImageUrl("/api/workshop/preview/" + previewFileName);
            widget2.setDownloadUrl("/api/workshop/download/" + widget2.getId());
            widget2.setDownloads(156);
            widget2.setLikes(98);
            workshopMap.put(widget2.getId(), widget2);
            
            // Dock类型
            Workshop dock1 = new Workshop();
            dock1.setName("MacOS风格Dock");
            dock1.setDescription("模仿MacOS风格的Dock栏，带有放大效果和流畅动画，让您的Windows系统拥有Mac般的体验。");
            dock1.setAuthor("设计师联盟");
            dock1.setType("dock");
            dock1.setTags(new String[]{"MacOS", "Dock", "动画"});
            
            // 生成预览图片
            previewFileName = "macos-dock.jpg";
            DemoImageGenerator.generateDemoImage(
                dock1.getType(), 
                dock1.getName(), 
                storagePath, 
                previewFileName
            );
            
            dock1.setPreviewImageUrl("/api/workshop/preview/" + previewFileName);
            dock1.setDownloadUrl("/api/workshop/download/" + dock1.getId());
            dock1.setDownloads(213);
            dock1.setLikes(187);
            workshopMap.put(dock1.getId(), dock1);
            
            // 桌宠类型
            Workshop pet1 = new Workshop();
            pet1.setName("电子猫咪");
            pet1.setDescription("可爱的电子猫咪，会做各种动作，还能与用户互动。支持自定义皮肤，让您的桌面充满生机。");
            pet1.setAuthor("宠物爱好者");
            pet1.setType("pet");
            pet1.setTags(new String[]{"猫咪", "萌宠", "互动"});
            
            // 生成预览图片
            previewFileName = "digital-cat.jpg";
            DemoImageGenerator.generateDemoImage(
                pet1.getType(), 
                pet1.getName(), 
                storagePath, 
                previewFileName
            );
            
            pet1.setPreviewImageUrl("/api/workshop/preview/" + previewFileName);
            pet1.setDownloadUrl("/api/workshop/download/" + pet1.getId());
            pet1.setDownloads(302);
            pet1.setLikes(275);
            workshopMap.put(pet1.getId(), pet1);
            
            Workshop pet2 = new Workshop();
            pet2.setName("迷你恐龙");
            pet2.setDescription("栩栩如生的迷你恐龙桌宠，会在桌面上漫步，休息，玩耍。还会对您的鼠标点击做出反应。");
            pet2.setAuthor("古生物团队");
            pet2.setType("pet");
            pet2.setTags(new String[]{"恐龙", "生物", "可爱"});
            
            // 生成预览图片
            previewFileName = "mini-dino.jpg";
            DemoImageGenerator.generateDemoImage(
                pet2.getType(), 
                pet2.getName(), 
                storagePath, 
                previewFileName
            );
            
            pet2.setPreviewImageUrl("/api/workshop/preview/" + previewFileName);
            pet2.setDownloadUrl("/api/workshop/download/" + pet2.getId());
            pet2.setDownloads(178);
            pet2.setLikes(134);
            workshopMap.put(pet2.getId(), pet2);
        } catch (IOException e) {
            // 忽略演示数据创建时的异常
            System.err.println("创建演示数据时出错: " + e.getMessage());
        }
    }
    
    /**
     * 获取所有创意工坊项目
     */
    public List<Workshop> getAllItems() {
        return new ArrayList<>(workshopMap.values());
    }
    
    /**
     * 根据类型获取创意工坊项目
     */
    public List<Workshop> getItemsByType(String type) {
        return workshopMap.values().stream()
                .filter(w -> w.getType().equals(type))
                .collect(Collectors.toList());
    }
    
    /**
     * 根据ID获取创意工坊项目
     */
    public Workshop getItemById(String id) {
        return workshopMap.get(id);
    }
    
    /**
     * 搜索创意工坊项目
     */
    public List<Workshop> searchItems(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllItems();
        }
        
        String lowerKeyword = keyword.toLowerCase();
        return workshopMap.values().stream()
                .filter(w -> (w.getName() != null && w.getName().toLowerCase().contains(lowerKeyword)) || 
                             (w.getDescription() != null && w.getDescription().toLowerCase().contains(lowerKeyword)) ||
                             (w.getAuthor() != null && w.getAuthor().toLowerCase().contains(lowerKeyword)) ||
                             (w.getTags() != null && containsTag(w.getTags(), lowerKeyword)))
                .collect(Collectors.toList());
    }
    
    /**
     * 检查标签是否包含关键词
     */
    private boolean containsTag(String[] tags, String keyword) {
        for (String tag : tags) {
            if (tag.toLowerCase().contains(keyword)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 添加下载计数
     */
    public Workshop incrementDownloads(String id) {
        Workshop workshop = workshopMap.get(id);
        if (workshop != null) {
            workshop.incrementDownloads();
        }
        return workshop;
    }
    
    /**
     * 添加点赞
     */
    public Workshop incrementLikes(String id) {
        Workshop workshop = workshopMap.get(id);
        if (workshop != null) {
            workshop.incrementLikes();
        }
        return workshop;
    }
    
    /**
     * 上传新项目
     */
    public Workshop uploadItem(Workshop workshop, MultipartFile previewImage, MultipartFile contentFile) throws IOException {
        if (previewImage == null || previewImage.isEmpty() || contentFile == null || contentFile.isEmpty()) {
            throw new IllegalArgumentException("预览图片和内容文件不能为空");
        }
        
        // 保存预览图片
        String previewImageName = "preview_" + System.currentTimeMillis() + getFileExtension(previewImage.getOriginalFilename());
        Path previewImagePath = Paths.get(storagePath, previewImageName);
        Files.copy(previewImage.getInputStream(), previewImagePath);
        
        // 保存内容文件
        String contentFileName = "content_" + System.currentTimeMillis() + getFileExtension(contentFile.getOriginalFilename());
        Path contentFilePath = Paths.get(storagePath, contentFileName);
        Files.copy(contentFile.getInputStream(), contentFilePath);
        
        // 设置URL
        workshop.setPreviewImageUrl("/api/workshop/preview/" + previewImageName);
        workshop.setDownloadUrl("/api/workshop/download/" + workshop.getId());
        
        // 保存到映射表中
        workshopMap.put(workshop.getId(), workshop);
        
        return workshop;
    }
    
    /**
     * 获取文件扩展名
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int dotIndex = filename.lastIndexOf('.');
        return (dotIndex == -1) ? "" : filename.substring(dotIndex);
    }
    
    /**
     * 获取预览图片文件
     */
    public Resource getPreviewImage(String fileName) {
        Path filePath = Paths.get(storagePath, fileName);
        if (!Files.exists(filePath)) {
            return null;
        }
        return new FileSystemResource(filePath.toFile());
    }
    
    /**
     * 获取下载内容文件
     */
    public Resource getContentFile(String id) {
        Workshop workshop = workshopMap.get(id);
        if (workshop == null) {
            return null;
        }
        
        // 从URL中提取文件名
        String url = workshop.getDownloadUrl();
        String fileName = url.substring(url.lastIndexOf('/') + 1);
        
        Path filePath = Paths.get(storagePath, fileName);
        if (!Files.exists(filePath)) {
            // 如果是演示数据，创建一个虚拟文件
            createDummyFile(id, filePath);
        }
        
        if (!Files.exists(filePath)) {
            return null;
        }
        
        return new FileSystemResource(filePath.toFile());
    }
    
    /**
     * 为演示数据创建虚拟文件
     */
    private void createDummyFile(String id, Path filePath) {
        try {
            Files.createFile(filePath);
            StringBuilder content = new StringBuilder();
            Workshop workshop = workshopMap.get(id);
            
            content.append("CodeCanvas 创意工坊演示内容\n\n");
            content.append("项目名称: ").append(workshop.getName()).append("\n");
            content.append("项目描述: ").append(workshop.getDescription()).append("\n");
            content.append("作者: ").append(workshop.getAuthor()).append("\n");
            content.append("类型: ").append(workshop.getType()).append("\n");
            content.append("标签: ");
            
            if (workshop.getTags() != null) {
                for (String tag : workshop.getTags()) {
                    content.append(tag).append(", ");
                }
            }
            
            content.append("\n\n这是一个演示文件，实际项目中应该包含真实的项目内容。");
            
            Files.write(filePath, content.toString().getBytes());
        } catch (IOException e) {
            // 忽略异常
        }
    }
} 