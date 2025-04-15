package org.example.config;

import org.example.service.WorkshopService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WorkshopApiSpringConfig {
    
    @Bean
    public WorkshopService workshopService() {
        return new WorkshopService();
    }
} 