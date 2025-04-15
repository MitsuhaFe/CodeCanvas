cmake_minimum_required(VERSION 3.10)
project(WallpaperSetter)

# 设置C++标准
set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 添加可执行文件
add_executable(WallpaperSetter WallpaperSetter.cpp)

# 设置输出目录为bin
set_target_properties(WallpaperSetter PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/bin"
)

# 链接Windows库
target_link_libraries(WallpaperSetter PRIVATE user32 gdi32 ole32) 