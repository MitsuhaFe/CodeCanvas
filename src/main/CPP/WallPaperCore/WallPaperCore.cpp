#define UNICODE
#define _UNICODE

#include <windows.h>
#include <stdio.h>
#include <shlobj.h>
#include <string>
#include <iostream>

// 日志记录函数
void LogInfo(const char* message) {
    std::cout << "[INFO] " << message << std::endl;
}

// 获取真实屏幕尺寸（考虑DPI缩放）
void GetActualScreenSize(int* width, int* height) {
    // 初始化为逻辑尺寸
    *width = GetSystemMetrics(SM_CXSCREEN);
    *height = GetSystemMetrics(SM_CYSCREEN);
    
    // 获取物理屏幕尺寸
    HDC hdc = GetDC(NULL);
    if (hdc) {
        int physicalWidth = GetDeviceCaps(hdc, DESKTOPHORZRES);
        int physicalHeight = GetDeviceCaps(hdc, DESKTOPVERTRES);
        
        // 获取逻辑屏幕尺寸，用于计算缩放比例
        int logicalWidth = GetDeviceCaps(hdc, HORZRES);
        int logicalHeight = GetDeviceCaps(hdc, VERTRES);
        
        ReleaseDC(NULL, hdc);
        
        // 如果GetDeviceCaps返回了有效值，则使用它
        if (physicalWidth > 0 && physicalHeight > 0) {
            // 计算缩放比例
            double scaleX = (double)physicalWidth / logicalWidth;
            double scaleY = (double)physicalHeight / logicalHeight;
            
            char logMsg[256];
            sprintf_s(logMsg, "物理屏幕尺寸: %d x %d", physicalWidth, physicalHeight);
            LogInfo(logMsg);
            
            sprintf_s(logMsg, "逻辑屏幕尺寸: %d x %d", logicalWidth, logicalHeight);
            LogInfo(logMsg);
            
            sprintf_s(logMsg, "检测到缩放比例: X=%.2f, Y=%.2f", scaleX, scaleY);
            LogInfo(logMsg);
            
            // 使用物理尺寸
            *width = physicalWidth;
            *height = physicalHeight;
            return;
        }
    }
    
    // 如果无法获取物理尺寸，尝试使用SetProcessDPIAware来获取
    SetProcessDPIAware(); // 调用此API使应用程序忽略系统DPI设置
    
    // 再次获取屏幕尺寸，此时应该是物理尺寸
    *width = GetSystemMetrics(SM_CXSCREEN);
    *height = GetSystemMetrics(SM_CYSCREEN);
    
    char logMsg[256];
    sprintf_s(logMsg, "DPI感知模式下的屏幕尺寸: %d x %d", *width, *height);
    LogInfo(logMsg);
}

// 桌面帮助类
class DeskTopHelper {
public:
    // 刷新桌面，清除残影
    static void Refresh() {
        SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, NULL, SPIF_UPDATEINIFILE);
    }

    // 创建WorkerW窗口
    static void CreateWorkerW() {
        HWND hProgman = FindWindow(L"Progman", NULL);
        if (hProgman == NULL) return;
        // 发送特殊消息创建WorkerW
        SendMessageTimeout(hProgman, 0x052C, 0xD, 0x1, SMTO_NORMAL, 1000, NULL);
    }

    // 获取WorkerW窗口句柄
    static HWND GetWorkerW() {
        HWND hWorkerW = NULL;
        CreateWorkerW();
        // 枚举窗口回调函数
        EnumWindows([](HWND tophandle, LPARAM topparamhandle) -> BOOL {
            HWND shelldll_defview = FindWindowEx(tophandle, NULL, L"SHELLDLL_DefView", NULL);
            
            if (shelldll_defview != NULL) {
                wchar_t className[256] = {0};
                GetClassName(tophandle, className, 256);
                if (wcscmp(className, L"WorkerW") != 0) {
                    return TRUE;
                }
                // 找到WorkerW窗口
                HWND* hWorkerW = (HWND*)topparamhandle;
                *hWorkerW = FindWindowEx(NULL, tophandle, L"WorkerW", NULL);
                return FALSE;
            }
            return TRUE;
        }, (LPARAM)&hWorkerW);
        // 如果没找到，尝试在Progman下查找
        if (hWorkerW == NULL) {
            HWND hProgman = FindWindow(L"Progman", NULL);
            if (hProgman != NULL) {
                hWorkerW = FindWindowEx(hProgman, NULL, L"WorkerW", NULL);
            }
        }
        return hWorkerW;
    }

    // 将窗口设置为桌面背景
    static bool SendHandleToDesktopBottom(HWND hwnd, RECT* bounds) {
        if (hwnd == NULL || bounds == NULL) return false;

        HWND hWorkerW = GetWorkerW();
        if (hWorkerW == NULL) return false;

        // 设置窗口样式
        AddWindowStyle(hwnd, WS_CHILDWINDOW);
        RemoveWindowStyle(hwnd, WS_POPUP);
        AddExtendedStyle(hwnd, WS_EX_CONTROLPARENT);
        AddExtendedStyle(hwnd, WS_EX_LAYERED);
        AddExtendedStyle(hwnd, WS_EX_NOACTIVATE);
        // WS_EX_NOREDIRECTIONBITMAP 在较老的Windows SDK可能未定义
        // 如果编译失败请移除此行或者使用条件编译
        #if (_WIN32_WINNT >= 0x0602) // Windows 8以上
        AddExtendedStyle(hwnd, WS_EX_NOREDIRECTIONBITMAP);
        #endif
        AddExtendedStyle(hwnd, WS_EX_TOOLWINDOW);
        RemoveExtendedStyle(hwnd, WS_EX_ACCEPTFILES);

        //刷新以便与更新窗口样式
        SetLayeredWindowAttributes(hwnd, 0, 255, LWA_ALPHA);
        UpdateWindow(hwnd);
        ShowWindow(hwnd, SW_SHOW);

        // 先将窗口移到屏幕外
        SetWindowPos(hwnd, NULL, -10000, 0, 0, 0, SWP_NOACTIVATE);

        // 尝试设置父窗口
        HWND res = NULL;
        int attempts = 0;
        const int maxAttempts = 50;
        
        while (res == NULL && attempts < maxAttempts) {
            res = SetParent(hwnd, hWorkerW);
            if (res == NULL) {
                Sleep(100);
            }
            attempts++;
            char log[256];
            sprintf_s(log, "SendHandleToDesktopBottom hwnd:%p worker:%p SetParentRes:%p attempts:%d", 
                     hwnd, hWorkerW, res, attempts);
            LogInfo(log);
        }

        // 转换坐标
        POINT points[2] = {
            {bounds->left, bounds->top},
            {bounds->right, bounds->bottom}
        };
        MapWindowPoints(NULL, hWorkerW, points, 2);

        // 重新设置窗口位置和大小
        RECT tmpBounds = {
            points[0].x,
            points[0].y,
            points[1].x - points[0].x,
            points[1].y - points[0].y
        };
        
        SetWindowPos(hwnd, NULL, 
                    tmpBounds.left, tmpBounds.top,
                    tmpBounds.right, tmpBounds.bottom,
                    SWP_NOACTIVATE);
        return true;
    }

private:
    static void AddWindowStyle(HWND hwnd, DWORD style)
    {
        std::cout <<"hwnd:" << hwnd << std::endl;
		std::cout << "style" << style << std::endl;
        LONG_PTR currentStyle = GetWindowLongPtr(hwnd, GWL_STYLE);
        
        
        SetWindowLongPtr(hwnd, GWL_STYLE, currentStyle | style);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    }

    static void RemoveWindowStyle(HWND hwnd, DWORD style)
    {
        LONG_PTR currentStyle = GetWindowLongPtr(hwnd, GWL_STYLE);
        SetWindowLongPtr(hwnd, GWL_STYLE, currentStyle & ~style);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    }

    static void AddExtendedStyle(HWND hwnd, DWORD exStyle)
    {
        LONG_PTR currentExStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE);
        SetWindowLongPtr(hwnd, GWL_EXSTYLE, currentExStyle | exStyle);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    }

    static void RemoveExtendedStyle(HWND hwnd, DWORD exStyle)
    {
        LONG_PTR currentExStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE);
        SetWindowLongPtr(hwnd, GWL_EXSTYLE, currentExStyle & ~exStyle);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    }

};

// 将char*转换为wchar_t*
wchar_t* charToWChar(const char* text)
{
    size_t size = strlen(text) + 1;
    wchar_t* wText = new wchar_t[size];
    size_t outSize;
    mbstowcs_s(&outSize, wText, size, text, size-1);
    return wText;
}

int main(int argc, char* argv[]) {
    // 设置DPI感知模式，确保获取正确的屏幕尺寸
    SetProcessDPIAware();
    
    // 检查命令行参数
    if (argc < 2) {
        std::cout << "用法: WallPaperCore.exe <视频文件路径>" << std::endl;
        return 1;
    }

    // 获取视频文件路径
    const char* videoPath = argv[1];
    std::cout << "[INFO] 设置动态壁纸: " << videoPath << std::endl;

    // 获取实际屏幕尺寸（考虑DPI缩放）
    int screenWidth, screenHeight;
    GetActualScreenSize(&screenWidth, &screenHeight);

    // 构建ffplay命令参数
    std::string paramStr = " \"";
    paramStr += videoPath;
    paramStr += "\" -noborder";
    
    // 使用更简单的视频滤镜方案解决黑边问题：
    // 1. 缩放视频使其覆盖整个屏幕（保持宽高比）
    // 2. 居中裁剪多余部分
    paramStr += " -vf \"scale=w=max(iw*";
    paramStr += std::to_string(screenHeight);
    paramStr += "/ih\\,";
    paramStr += std::to_string(screenWidth);
    paramStr += "):h=max(ih*";
    paramStr += std::to_string(screenWidth);
    paramStr += "/iw\\,";
    paramStr += std::to_string(screenHeight);
    paramStr += "),crop=";
    paramStr += std::to_string(screenWidth);
    paramStr += ":";
    paramStr += std::to_string(screenHeight);
    paramStr += "\"";
    
    // 循环播放
    paramStr += " -loop 0";

    // 将std::string转换为LPWSTR
    wchar_t* lpParameter = charToWChar(paramStr.c_str());

    // 获取当前程序目录
    char currentDir[MAX_PATH];
    GetCurrentDirectoryA(MAX_PATH, currentDir);
    std::string ffplayPath = std::string(currentDir) + "\\bin\\ffmpeg\\bin\\ffplay.exe";
    std::cout << "[INFO] ffplay路径: " << ffplayPath << std::endl;

    // 转换ffplay路径
    wchar_t* wFfplayPath = charToWChar(ffplayPath.c_str());

    // 创建ffplay进程
    STARTUPINFOW si{ 0 };
    PROCESS_INFORMATION pi{ 0 };
    si.cb = sizeof(STARTUPINFOW);  // 初始化STARTUPINFO结构体

    std::cout << "[INFO] 启动ffplay进程，参数: " << paramStr << std::endl;

    if (CreateProcessW(wFfplayPath, lpParameter, 0, 0, 0, 0, 0, 0, &si, &pi))
    {
        printf("ffplay进程已创建，进程ID: %d\n", pi.dwProcessId);
        Sleep(1000);                                // 增加等待时间到1秒

        // 尝试查找播放窗口
        HWND hFfplay = NULL;
        for (int i = 0; i < 5; i++) {  // 尝试5次
            hFfplay = FindWindowW(L"SDL_app", 0);
            if (hFfplay != NULL) {
                printf("找到SDL_app窗口\n");
                break;
            }
            Sleep(200);  // 每次尝试间隔200ms
        }
        if (hFfplay == NULL) {
            // 如果找不到SDL_app，尝试其他可能的类名
            hFfplay = FindWindowW(L"SDL_Window", 0);
            if (hFfplay != NULL) {
                printf("找到SDL_Window窗口\n");
            }
        }

        RECT bounds = {0, 0, screenWidth, screenHeight};      // 使用屏幕分辨率
    
        // 刷新桌面
        DeskTopHelper::Refresh();
    
        // 将窗口设置为桌面背景
        if (DeskTopHelper::SendHandleToDesktopBottom(hFfplay, &bounds)) {
            LogInfo("成功将视频窗口设置为桌面背景");
        } else {
            LogInfo("设置视频窗口为桌面背景失败");
        }

        // 释放内存
        delete[] lpParameter;
        delete[] wFfplayPath;

        return 0;
    } else {
        DWORD error = GetLastError();
        std::cout << "[ERROR] 创建ffplay进程失败，错误码: " << error << std::endl;
        delete[] lpParameter;
        delete[] wFfplayPath;
        return error;
    }
}