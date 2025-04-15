cmake_minimum_required(VERSION 3.10)
project(DockBar)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 添加可执行文件
add_executable(DockBar 
    DockBar.cpp
)

# Windows特定设置
if(WIN32)
    target_link_libraries(DockBar
        user32
        gdi32
        dwmapi
    )
endif()

# 安装目标
install(TARGETS DockBar DESTINATION bin) 