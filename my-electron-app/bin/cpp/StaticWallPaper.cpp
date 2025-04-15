#include <iostream>
#include <Windows.h>
#include <string>

int main(int argc, wchar_t* argv[])
{
    try
    {
        // 检查参数数量
        if (argc < 2)
        {
            std::wcout << L"错误: 请提供壁纸路径" << std::endl;
            return 1;
        }

        // 获取图片路径参数
        std::wstring imagePath = argv[1];
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
            std::wcout << L"壁纸设置成功!" << std::endl;
        }
        else
        {
            std::wcout << L"壁纸设置失败，错误代码: " << GetLastError() << std::endl;
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