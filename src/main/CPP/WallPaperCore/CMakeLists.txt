cmake_minimum_required(VERSION 3.10)
project(WallPaperCore)

# 设置C++标准
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 设置输出目录
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/bin)

# 添加可执行文件
add_executable(WallPaperCore WallPaperCore.cpp)

# 链接Windows库
target_link_libraries(WallPaperCore user32)

# 设置输出名称
set_target_properties(WallPaperCore PROPERTIES
    OUTPUT_NAME "WallPaperCore"
) 