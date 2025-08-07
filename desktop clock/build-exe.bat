@echo off
echo ========================================
echo  Desktop Clock - 构建独立EXE文件
echo ========================================
echo.
echo [1/3] 清理旧文件...
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
echo.
echo [2/3] 构建React生产版本...
call npm run build
echo.
echo [3/3] 打包成Windows可执行文件...
call npx electron-builder --win --dir
echo.
echo ========================================
echo  构建完成！
echo ========================================
echo.
echo 可执行文件位置：
echo dist\win-unpacked\Desktop Clock.exe
echo.
echo 您可以：
echo 1. 直接运行 dist\win-unpacked\Desktop Clock.exe
echo 2. 将整个 win-unpacked 文件夹复制到任意位置使用
echo.
pause