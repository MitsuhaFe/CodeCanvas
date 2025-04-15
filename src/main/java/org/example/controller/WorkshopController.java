package org.example.controller;

import org.example.model.Workshop;
import org.example.service.WorkshopService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * 创意工坊控制器
 */
@RestController
@RequestMapping("/api/workshop")
@CrossOrigin
public class WorkshopController {
    
    private final WorkshopService workshopService;
    
    @Autowired
    public WorkshopController(WorkshopService workshopService) {
        this.workshopService = workshopService;
    }
    
    /**
     * 获取所有创意工坊项目
     */
    @GetMapping
    public List<Workshop> getAllItems() {
        return workshopService.getAllItems();
    }
    
    /**
     * 根据类型获取创意工坊项目
     */
    @GetMapping("/type/{type}")
    public List<Workshop> getItemsByType(@PathVariable String type) {
        return workshopService.getItemsByType(type);
    }
    
    /**
     * 根据ID获取创意工坊项目
     */
    @GetMapping("/{id}")
    public Workshop getItemById(@PathVariable String id) {
        return workshopService.getItemById(id);
    }
    
    /**
     * 搜索创意工坊项目
     */
    @GetMapping("/search")
    public List<Workshop> searchItems(@RequestParam String keyword) {
        return workshopService.searchItems(keyword);
    }
    
    /**
     * 上传新项目
     */
    @PostMapping
    public Workshop uploadItem(
            @RequestParam("name") String name,
            @RequestParam("description") String description,
            @RequestParam("author") String author,
            @RequestParam("type") String type,
            @RequestParam("tags") String[] tags,
            @RequestParam("previewImage") MultipartFile previewImage,
            @RequestParam("contentFile") MultipartFile contentFile
    ) throws IOException {
        Workshop workshop = new Workshop();
        workshop.setId(UUID.randomUUID().toString());
        workshop.setName(name);
        workshop.setDescription(description);
        workshop.setAuthor(author);
        workshop.setType(type);
        workshop.setTags(tags);
        workshop.setDownloads(0);
        workshop.setLikes(0);
        
        return workshopService.uploadItem(workshop, previewImage, contentFile);
    }
    
    /**
     * 增加下载计数
     */
    @PostMapping("/download/{id}")
    public Workshop downloadItem(@PathVariable String id) {
        return workshopService.incrementDownloads(id);
    }
    
    /**
     * 获取预览图片
     */
    @GetMapping("/preview/{fileName}")
    public ResponseEntity<Resource> getPreviewImage(@PathVariable String fileName) {
        Resource file = workshopService.getPreviewImage(fileName);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                .contentType(MediaType.IMAGE_JPEG)
                .body(file);
    }
    
    /**
     * 获取项目内容
     */
    @GetMapping("/content/{id}")
    public ResponseEntity<Resource> getContentFile(@PathVariable String id) {
        Resource file = workshopService.getContentFile(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }

    @PostMapping("/like/{id}")
    public Workshop likeItem(@PathVariable String id) {
        return workshopService.incrementLikes(id);
    }
} 