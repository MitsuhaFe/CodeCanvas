package org.example.model;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 创意工坊项目实体类
 */
public class Workshop {
    private String id;
    private String name;
    private String description;
    private String author;
    private String previewImageUrl;
    private String downloadUrl;
    private int downloads;
    private int likes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String type; // 类型：wallpaper、widget、dock、pet
    private String[] tags;
    
    public Workshop() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.downloads = 0;
        this.likes = 0;
    }
    
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getPreviewImageUrl() {
        return previewImageUrl;
    }

    public void setPreviewImageUrl(String previewImageUrl) {
        this.previewImageUrl = previewImageUrl;
    }

    public String getDownloadUrl() {
        return downloadUrl;
    }

    public void setDownloadUrl(String downloadUrl) {
        this.downloadUrl = downloadUrl;
    }

    public int getDownloads() {
        return downloads;
    }

    public void setDownloads(int downloads) {
        this.downloads = downloads;
    }

    public int getLikes() {
        return likes;
    }

    public void setLikes(int likes) {
        this.likes = likes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String[] getTags() {
        return tags;
    }

    public void setTags(String[] tags) {
        this.tags = tags;
    }
    
    /**
     * 增加下载计数
     */
    public void incrementDownloads() {
        this.downloads++;
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * 增加点赞计数
     */
    public void incrementLikes() {
        this.likes++;
        this.updatedAt = LocalDateTime.now();
    }
} 