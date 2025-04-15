@echo off
echo 开始编译壁纸设置程序...

REM 设置变量
set CPP_DIR=%~dp0cpp
set OUT_DIR=%~dp0

REM 编译静态壁纸程序
echo 编译静态壁纸程序...
cl /EHsc /W4 /std:c++17 "%CPP_DIR%\StaticWallPaper.cpp" /Fe:"%OUT_DIR%\StaticWallPaper.exe" /link User32.lib

REM 检查编译结果
if %errorlevel% neq 0 (
    echo 静态壁纸程序编译失败!
    exit /b %errorlevel%
) else (
    echo 静态壁纸程序编译成功!
)

REM 编译动态壁纸程序
echo 编译动态壁纸程序...
cl /EHsc /W4 /std:c++17 "%CPP_DIR%\WallPaperCore.cpp" /Fe:"%OUT_DIR%\WallPaperCore.exe" /link User32.lib

REM 检查编译结果
if %errorlevel% neq 0 (
    echo 动态壁纸程序编译失败!
    exit /b %errorlevel%
) else (
    echo 动态壁纸程序编译成功!
)

echo 所有程序编译完成!
exit /b 0 