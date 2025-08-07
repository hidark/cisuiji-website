@echo off
echo ========================================
echo  Desktop Clock - 生产模式
echo ========================================
echo.
if not exist build (
    echo 正在构建生产版本...
    call npm run build
)
echo.
echo 启动应用...
npm run electron
pause