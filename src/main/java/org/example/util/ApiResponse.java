package org.example.util;

import java.util.HashMap;
import java.util.Map;

/**
 * API响应工具类，用于统一API响应格式
 */
public class ApiResponse {
    
    /**
     * 创建成功响应
     * 
     * @param message 成功消息
     * @return 响应对象
     */
    public static Map<String, Object> success(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        return response;
    }
    
    /**
     * 创建成功响应，带数据
     * 
     * @param message 成功消息
     * @param data 响应数据
     * @return 响应对象
     */
    public static Map<String, Object> success(String message, Object data) {
        Map<String, Object> response = success(message);
        response.put("data", data);
        return response;
    }
    
    /**
     * 创建错误响应
     * 
     * @param message 错误消息
     * @return 响应对象
     */
    public static Map<String, Object> error(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
    
    /**
     * 创建错误响应，带数据
     * 
     * @param message 错误消息
     * @param data 响应数据
     * @return 响应对象
     */
    public static Map<String, Object> error(String message, Object data) {
        Map<String, Object> response = error(message);
        response.put("data", data);
        return response;
    }
} 