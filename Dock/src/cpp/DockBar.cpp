#include <windows.h>
#include <dwmapi.h>
#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <chrono>

#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")

// 定义Windows Unicode支持
#ifndef UNICODE
#define UNICODE
#endif

// 全局变量
HWND g_hWnd = NULL;
bool g_isRunning = true;
bool g_autoHide = false;
int g_position = 0; // 0=底部, 1=顶部, 2=左侧, 3=右侧
int g_width = 600;
int g_height = 60;
int g_cornerRadius = 10;
int g_red = 255;
int g_green = 255;
int g_blue = 255;
int g_alpha = 200;
bool g_alwaysOnTop = true;
bool g_allowDrag = false; // 添加允许拖动选项

// 前向声明
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
void ApplyWindowStyles();
void PositionWindow();

int main(int argc, char* argv[]) {
    // 解析命令行参数
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--position") {
            if (i + 1 < argc) {
                g_position = std::stoi(argv[i + 1]);
                i++;
            }
        } else if (arg == "--width") {
            if (i + 1 < argc) {
                g_width = std::stoi(argv[i + 1]);
                i++;
            }
        } else if (arg == "--height") {
            if (i + 1 < argc) {
                g_height = std::stoi(argv[i + 1]);
                i++;
            }
        } else if (arg == "--corner-radius") {
            if (i + 1 < argc) {
                g_cornerRadius = std::stoi(argv[i + 1]);
                i++;
            }
        } else if (arg == "--color") {
            if (i + 3 < argc) {
                g_red = std::stoi(argv[i + 1]);
                g_green = std::stoi(argv[i + 2]);
                g_blue = std::stoi(argv[i + 3]);
                i += 3;
            }
        } else if (arg == "--alpha") {
            if (i + 1 < argc) {
                g_alpha = std::stoi(argv[i + 1]);
                i++;
            }
        } else if (arg == "--auto-hide") {
            g_autoHide = true;
        } else if (arg == "--no-always-on-top") {
            g_alwaysOnTop = false;
        } else if (arg == "--allow-drag") {
            g_allowDrag = true;  // 设置允许拖动标志
        }
    }

    // 注册窗口类
    WNDCLASSEXW wc = {0};
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = GetModuleHandle(NULL);
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.lpszClassName = L"CodeCanvasDockBar";
    
    if (!RegisterClassExW(&wc)) {
        std::cerr << "Error registering window class" << std::endl;
        return 1;
    }
    
    // 创建窗口
    g_hWnd = CreateWindowExW(
        WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        L"CodeCanvasDockBar",
        L"Dock Bar",
        WS_POPUP,
        0, 0, g_width, g_height,
        NULL, NULL, GetModuleHandle(NULL), NULL
    );
    
    if (g_hWnd == NULL) {
        std::cerr << "Error creating window" << std::endl;
        return 1;
    }
    
    // 应用窗口样式
    ApplyWindowStyles();
    
    // 定位窗口
    PositionWindow();
    
    // 显示窗口
    ShowWindow(g_hWnd, SW_SHOW);
    UpdateWindow(g_hWnd);
    
    // 消息循环
    MSG msg = {0};
    while (g_isRunning) {
        while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
            if (msg.message == WM_QUIT) {
                g_isRunning = false;
                break;
            }
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }
        
        // 自动隐藏逻辑
        if (g_autoHide) {
            static bool isHidden = false;
            POINT pt;
            GetCursorPos(&pt);
            
            RECT rc;
            GetWindowRect(g_hWnd, &rc);
            
            // 扩展检测区域
            rc.left -= 20;
            rc.top -= 20;
            rc.right += 20;
            rc.bottom += 20;
            
            if (PtInRect(&rc, pt)) {
                if (isHidden) {
                    ShowWindow(g_hWnd, SW_SHOW);
                    isHidden = false;
                }
            } else {
                if (!isHidden) {
                    ShowWindow(g_hWnd, SW_HIDE);
                    isHidden = true;
                }
            }
        }
        
        // 避免CPU使用率过高
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }
    
    return 0;
}

// 窗口过程函数
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_DESTROY:
            g_isRunning = false;
            PostQuitMessage(0);
            return 0;
        
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            
            // 清除背景
            RECT rc;
            GetClientRect(hwnd, &rc);
            HBRUSH hBrush = CreateSolidBrush(RGB(g_red, g_green, g_blue));
            FillRect(hdc, &rc, hBrush);
            DeleteObject(hBrush);
            
            EndPaint(hwnd, &ps);
            return 0;
        }
        
        case WM_LBUTTONDOWN:
            // 如果允许拖动，则响应鼠标左键按下
            if (g_allowDrag) {
                // 允许用户拖动窗口
                PostMessage(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            }
            return 0;
            
        default:
            return DefWindowProc(hwnd, uMsg, wParam, lParam);
    }
}

// 应用窗口样式
void ApplyWindowStyles() {
    // 设置窗口透明度
    SetLayeredWindowAttributes(g_hWnd, 0, g_alpha, LWA_ALPHA);
    
    // 使用DWM API设置圆角
    if (g_cornerRadius > 0) {
        HRGN hRgn = CreateRoundRectRgn(0, 0, g_width + 1, g_height + 1, g_cornerRadius, g_cornerRadius);
        SetWindowRgn(g_hWnd, hRgn, TRUE);
        DeleteObject(hRgn);
        
        // 尝试使用DWM扩展实现更平滑的圆角
        DWM_WINDOW_CORNER_PREFERENCE preference = DWMWCP_ROUND;
        DwmSetWindowAttribute(g_hWnd, DWMWA_WINDOW_CORNER_PREFERENCE, &preference, sizeof(preference));
    }
    
    // 设置顶层窗口
    if (g_alwaysOnTop) {
        SetWindowPos(g_hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
    } else {
        SetWindowPos(g_hWnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);
    }
}

// 定位窗口
void PositionWindow() {
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    int x = 0, y = 0;
    
    switch (g_position) {
        case 0: // 底部
            x = (screenWidth - g_width) / 2;
            y = screenHeight - g_height - 10;
            break;
        case 1: // 顶部
            x = (screenWidth - g_width) / 2;
            y = 10;
            break;
        case 2: // 左侧
            x = 10;
            y = (screenHeight - g_height) / 2;
            break;
        case 3: // 右侧
            x = screenWidth - g_width - 10;
            y = (screenHeight - g_height) / 2;
            break;
    }
    
    SetWindowPos(g_hWnd, NULL, x, y, g_width, g_height, SWP_NOZORDER);
} 