@echo off
echo 正在编译Dock栏程序...

if not exist build mkdir build
cd build

cmake -G "MinGW Makefiles" ..
cmake --build . --config Release

echo 编译完成！
if exist DockBar.exe (
    echo 成功生成DockBar.exe
    copy DockBar.exe ..\..\..\bin\
    echo 已复制DockBar.exe到bin目录
) else (
    echo 编译失败，未生成DockBar.exe
)

cd .. 