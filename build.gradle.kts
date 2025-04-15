plugins {
    java
    id("org.springframework.boot") version "3.2.3"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "org.example"
version = "1.0-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.github.oshi:oshi-core:6.4.5")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.15.0")  // 版本号请与你的Jackson核心库保持一致
    implementation("commons-io:commons-io:2.11.0")
}

tasks.test {
    useJUnitPlatform()
}

// 添加CMake构建任务
tasks.register<Exec>("buildStaticWallPaper") {
    description = "构建静态壁纸设置程序"
    group = "build"
    
    // 确保目录存在
    doFirst {
        mkdir("src/main/CPP/StaticWallPaper/bin")
    }
    
    // 调用CMake配置
    workingDir = file("src/main/CPP/StaticWallPaper")
    commandLine("cmake", ".")
    
    // 构建项目
    doLast {
        exec {
            workingDir = file("src/main/CPP/StaticWallPaper")
            commandLine("cmake", "--build", ".", "--config", "Release")
        }
    }
}

// 将C++构建任务添加到Java构建流程中
tasks.named("build") {
    dependsOn("buildStaticWallPaper")
}

// 配置C++壁纸设置程序的构建
tasks.register<Exec>("buildWallpaperSetter") {
    description = "构建壁纸设置C++程序"
    group = "build"

    // Windows系统下的命令
    commandLine("cmd", "/c", "mkdir", "-p", "${projectDir}/native/build")
    doLast {
        exec {
            workingDir("${projectDir}/native/build")
            commandLine("cmd", "/c", "cmake", "..")
        }
        exec {
            workingDir("${projectDir}/native/build")
            commandLine("cmd", "/c", "cmake", "--build", ".", "--config", "Release")
        }
    }
}

// 让主构建任务依赖于C++程序的构建
tasks.named("build") {
    dependsOn("buildWallpaperSetter")
}