#include <windows.h>
#include <iostream>
#include <string>

// 将宽字符转换为UTF-8字符串
std::string WideToUTF8(const std::wstring& wstr) {
    if (wstr.empty()) return std::string();
    
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);
    return strTo;
}

// 将UTF-8字符串转换为宽字符
std::wstring UTF8ToWide(const std::string& str) {
    if (str.empty()) return std::wstring();
    
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
    std::wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstrTo[0], size_needed);
    return wstrTo;
}

// 设置壁纸函数
bool SetWallpaper(const std::wstring& imagePath) {
    // 使用Windows API设置壁纸
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
    if (FAILED(hr)) {
        std::wcerr << L"CoInitializeEx 失败: " << hr << std::endl;
        return false;
    }

    bool result = false;
    
    // 确保路径格式正确 (必须是完整路径)
    if (!imagePath.empty()) {
        // 设置壁纸使用SystemParametersInfo函数
        if (SystemParametersInfoW(SPI_SETDESKWALLPAPER, 0, (PVOID)imagePath.c_str(), SPIF_UPDATEINIFILE | SPIF_SENDCHANGE)) {
            std::wcout << L"壁纸设置成功: " << imagePath.c_str() << std::endl;
            result = true;
        } else {
            DWORD error = GetLastError();
            std::wcerr << L"壁纸设置失败, 错误码: " << error << std::endl;
        }
    } else {
        std::wcerr << L"错误: 无效的图片路径" << std::endl;
    }

    CoUninitialize();
    return result;
}

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "用法: WallpaperSetter.exe <壁纸路径>" << std::endl;
        return 1;
    }

    std::string imagePath = argv[1];
    std::wstring wideImagePath = UTF8ToWide(imagePath);

    // 输出信息用于调试
    std::cout << "尝试设置壁纸: " << imagePath << std::endl;
    
    if (SetWallpaper(wideImagePath)) {
        return 0; // 成功
    } else {
        return 1; // 失败
    }
} 