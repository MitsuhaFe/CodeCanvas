#include <windows.h>
#include <stdio.h>
#include <shlobj.h>
#include <string>
#include <iostream>

// 日志记录函数
void LogInfo(const char* message) {
    std::cout << "[INFO] " << message << std::endl;
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
        AddExtendedStyle(hwnd, WS_EX_NOREDIRECTIONBITMAP);
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

int main(int argc, wchar_t* argv[])
{
    try
    {
        // 检查参数数量
        if (argc < 2)
        {
            std::wcout << L"错误: 请提供视频路径" << std::endl;
            return 1;
        }

        // 获取视频路径参数
        std::wstring videoPath = argv[1];
        std::wcout << L"设置视频壁纸路径: " << videoPath << std::endl;
        
        // 检查文件是否存在
        DWORD fileAttributes = GetFileAttributesW(videoPath.c_str());
        if (fileAttributes == INVALID_FILE_ATTRIBUTES)
        {
            std::wcout << L"错误: 未找到视频文件: " << videoPath << std::endl;
            return 1;
        }
        
        // 构建ffplay命令参数
        std::wstring ffplayParams = L" \"";
        ffplayParams += videoPath;
        ffplayParams += L"\" -noborder -x 1920 -y 1080 -loop 0";
        
        // 获取屏幕分辨率
        int screenWidth = GetSystemMetrics(SM_CXSCREEN);
        int screenHeight = GetSystemMetrics(SM_CYSCREEN);
        
        // 使用实际分辨率
        wchar_t resolutionStr[128];
        swprintf_s(resolutionStr, L" \"%s\" -noborder -x %d -y %d -loop 0", 
                  videoPath.c_str(), screenWidth, screenHeight);
        
        // 准备启动ffplay
        STARTUPINFO si{ 0 };
        PROCESS_INFORMATION pi{ 0 };
        si.cb = sizeof(STARTUPINFO);
        
        // ffplay路径，相对于当前目录
        wchar_t currentDir[MAX_PATH];
        GetCurrentDirectoryW(MAX_PATH, currentDir);
        std::wstring ffplayPath = std::wstring(currentDir) + L"\\bin\\ffmpeg\\bin\\ffplay.exe";
        
        // 创建ffplay进程
        if (CreateProcess(ffplayPath.c_str(), (LPWSTR)resolutionStr, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi))
        {
            printf("ffplay进程已创建，进程ID: %d\n", pi.dwProcessId);
            Sleep(1000); // 等待ffplay启动
            
            // 尝试查找播放窗口
            HWND hFfplay = NULL;
            for (int i = 0; i < 5; i++) {
                hFfplay = FindWindow(L"SDL_app", NULL);
                if (hFfplay != NULL) {
                    printf("找到SDL_app窗口\n");
                    break;
                }
                Sleep(200); // 每次尝试间隔200ms
            }
            
            if (hFfplay == NULL) {
                // 如果找不到SDL_app，尝试其他可能的类名
                hFfplay = FindWindow(L"SDL_Window", NULL);
                if (hFfplay != NULL) {
                    printf("找到SDL_Window窗口\n");
                }
            }
            
            if (hFfplay != NULL) {
                // 设置播放窗口的位置和大小
                RECT bounds = {0, 0, screenWidth, screenHeight};
                
                // 刷新桌面
                DeskTopHelper::Refresh();
                
                // 将窗口设置为桌面背景
                if (DeskTopHelper::SendHandleToDesktopBottom(hFfplay, &bounds)) {
                    LogInfo("视频壁纸设置成功");
                    // 返回成功
                    return 0;
                } else {
                    LogInfo("将视频窗口设置为桌面背景失败");
                }
            } else {
                printf("未找到ffplay窗口\n");
            }
            
            // 如果设置失败，终止ffplay进程
            TerminateProcess(pi.hProcess, 0);
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
            return 1;
        }
        else {
            std::wcout << L"启动ffplay失败，错误代码: " << GetLastError() << std::endl;
            return 1;
        }
    }
    catch (const std::exception& e)
    {
        std::cout << "发生错误: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
} 