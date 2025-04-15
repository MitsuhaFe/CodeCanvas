#include <iostream>
#include <Windows.h>
#include <string>

int main(int argc, char* argv[])
{
    try
    {
        // 从命令行参数获取图片路径
        std::wstring imagePath;
        
        if (argc > 1) {
            // 将char*转换为wstring
            int wchars_num = MultiByteToWideChar(CP_UTF8, 0, argv[1], -1, NULL, 0);
            wchar_t* wstr = new wchar_t[wchars_num];
            MultiByteToWideChar(CP_UTF8, 0, argv[1], -1, wstr, wchars_num);
            imagePath = std::wstring(wstr);
            delete[] wstr;
        } else {
            std::cout << "错误: 未提供图片路径" << std::endl;
            return 1;
        }
        
        // 输出图片路径用于调试
        std::wcout << L"设置壁纸路径: " << imagePath << std::endl;
        
        // 检查文件是否存在
        DWORD fileAttributes = GetFileAttributesW(imagePath.c_str());
        if (fileAttributes == INVALID_FILE_ATTRIBUTES)
        {
            std::wcout << L"错误: 未找到图片文件: " << imagePath << std::endl;
            return 1;
        }
        
        // 设置壁纸
        BOOL result = SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            (PVOID)imagePath.c_str(),
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
        );
        
        if (result)
        {
            std::cout << "壁纸设置成功!" << std::endl;
        }
        else
        {
            std::cout << "壁纸设置失败，错误代码: " << GetLastError() << std::endl;
        }
    }
    catch (const std::exception& e)
    {
        std::cout << "发生错误: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}