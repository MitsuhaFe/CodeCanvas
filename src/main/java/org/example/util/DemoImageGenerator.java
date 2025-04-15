package org.example.util;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Random;

/**
 * 演示图片生成工具类
 */
public class DemoImageGenerator {
    
    private static final int WIDTH = 800;
    private static final int HEIGHT = 450;
    private static final Random random = new Random();
    
    /**
     * 生成演示图片
     * 
     * @param type 类型 (wallpaper, widget, dock, pet)
     * @param name 项目名称
     * @param storagePath 存储路径
     * @param fileName 文件名
     * @return 生成的图片文件
     * @throws IOException 如果创建图片失败
     */
    public static File generateDemoImage(String type, String name, String storagePath, String fileName) throws IOException {
        // 创建存储目录
        Path path = Paths.get(storagePath);
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }
        
        // 创建图片
        BufferedImage image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = image.createGraphics();
        
        // 设置抗锯齿
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        
        // 根据类型设置背景颜色
        switch (type) {
            case "wallpaper":
                drawWallpaperBackground(g2d);
                break;
            case "widget":
                drawWidgetBackground(g2d);
                break;
            case "dock":
                drawDockBackground(g2d);
                break;
            case "pet":
                drawPetBackground(g2d);
                break;
            default:
                drawDefaultBackground(g2d);
        }
        
        // 添加标题
        g2d.setColor(Color.WHITE);
        g2d.setFont(new Font("Arial", Font.BOLD, 40));
        FontMetrics metrics = g2d.getFontMetrics();
        int titleWidth = metrics.stringWidth(name);
        g2d.drawString(name, (WIDTH - titleWidth) / 2, HEIGHT / 2);
        
        // 添加类型标签
        g2d.setFont(new Font("Arial", Font.PLAIN, 24));
        g2d.drawString("类型: " + formatType(type), 50, HEIGHT - 50);
        
        // 添加CodeCanvas水印
        g2d.setFont(new Font("Arial", Font.ITALIC, 16));
        g2d.drawString("CodeCanvas 创意工坊", WIDTH - 200, HEIGHT - 20);
        
        // 释放资源
        g2d.dispose();
        
        // 保存图片
        File outputFile = new File(storagePath, fileName);
        ImageIO.write(image, "jpg", outputFile);
        
        return outputFile;
    }
    
    private static void drawWallpaperBackground(Graphics2D g2d) {
        // 渐变背景
        GradientPaint gradient = new GradientPaint(
            0, 0, new Color(41, 128, 185),
            WIDTH, HEIGHT, new Color(142, 68, 173)
        );
        g2d.setPaint(gradient);
        g2d.fillRect(0, 0, WIDTH, HEIGHT);
        
        // 添加星星
        g2d.setColor(Color.WHITE);
        for (int i = 0; i < 100; i++) {
            int x = random.nextInt(WIDTH);
            int y = random.nextInt(HEIGHT);
            int size = random.nextInt(3) + 1;
            g2d.fillOval(x, y, size, size);
        }
    }
    
    private static void drawWidgetBackground(Graphics2D g2d) {
        // 纯色背景
        g2d.setColor(new Color(52, 152, 219));
        g2d.fillRect(0, 0, WIDTH, HEIGHT);
        
        // 绘制小组件外观
        g2d.setColor(new Color(41, 128, 185));
        g2d.fillRoundRect(WIDTH/4, HEIGHT/4, WIDTH/2, HEIGHT/2, 20, 20);
        
        // 添加一些小组件元素
        g2d.setColor(Color.WHITE);
        g2d.drawLine(WIDTH/4 + 30, HEIGHT/2, WIDTH*3/4 - 30, HEIGHT/2);
        g2d.drawRect(WIDTH/4 + 30, HEIGHT/4 + 30, 100, 60);
        g2d.drawOval(WIDTH*3/4 - 130, HEIGHT/4 + 30, 100, 60);
    }
    
    private static void drawDockBackground(Graphics2D g2d) {
        // 纯色背景
        g2d.setColor(new Color(44, 62, 80));
        g2d.fillRect(0, 0, WIDTH, HEIGHT);
        
        // 绘制Dock栏
        g2d.setColor(new Color(52, 73, 94, 200));
        g2d.fillRoundRect(WIDTH/4, HEIGHT*2/3, WIDTH/2, HEIGHT/6, 15, 15);
        
        // 绘制图标
        for (int i = 0; i < 5; i++) {
            g2d.setColor(getRandomColor());
            g2d.fillRoundRect(WIDTH/4 + 20 + i*80, HEIGHT*2/3 + 10, 60, 60, 10, 10);
        }
    }
    
    private static void drawPetBackground(Graphics2D g2d) {
        // 纯色背景
        g2d.setColor(new Color(46, 204, 113));
        g2d.fillRect(0, 0, WIDTH, HEIGHT);
        
        // 绘制草地
        g2d.setColor(new Color(39, 174, 96));
        for (int i = 0; i < HEIGHT/2; i += 5) {
            g2d.drawLine(0, HEIGHT - i/2, WIDTH, HEIGHT - i/2);
        }
        
        // 绘制简单的宠物轮廓
        g2d.setColor(new Color(52, 73, 94));
        g2d.fillOval(WIDTH/2 - 75, HEIGHT/2 - 75, 150, 150);
        g2d.setColor(Color.WHITE);
        g2d.fillOval(WIDTH/2 - 40, HEIGHT/2 - 40, 30, 30);
        g2d.fillOval(WIDTH/2 + 10, HEIGHT/2 - 40, 30, 30);
    }
    
    private static void drawDefaultBackground(Graphics2D g2d) {
        // 纯色背景
        g2d.setColor(new Color(52, 152, 219));
        g2d.fillRect(0, 0, WIDTH, HEIGHT);
    }
    
    private static Color getRandomColor() {
        return new Color(
            random.nextInt(200) + 55,
            random.nextInt(200) + 55,
            random.nextInt(200) + 55
        );
    }
    
    private static String formatType(String type) {
        switch (type) {
            case "wallpaper":
                return "壁纸";
            case "widget":
                return "小组件";
            case "dock":
                return "Dock任务栏";
            case "pet":
                return "桌宠精灵";
            default:
                return type;
        }
    }
} 