@echo off
echo ========================================
echo   Desktop Clock - 一键恢复工具
echo ========================================
echo.
echo 当前项目状态: 已深度清理 (仅48KB)
echo 即将恢复: 安装所有依赖包 (~1GB)
echo.
echo 恢复选项:
echo [1] 完整恢复并启动 (推荐)
echo [2] 仅恢复依赖
echo [3] 恢复后打包
echo [4] 取消
echo.
set /p choice="请选择 (1-4): "

if "%choice%"=="1" goto full_restore
if "%choice%"=="2" goto restore_only
if "%choice%"=="3" goto restore_and_build
if "%choice%"=="4" goto cancel

:full_restore
echo.
echo [1/3] 正在安装依赖包...
call npm install
echo.
echo [2/3] 依赖安装完成，启动React服务器...
start cmd /k "npm start"
echo.
echo [3/3] 等待React启动...
timeout /t 10 /nobreak > nul
echo.
echo 启动Electron窗口...
npm run electron-dev
goto end

:restore_only
echo.
echo 正在安装依赖包...
call npm install
echo.
echo ✅ 依赖恢复完成！
echo 💡 启动应用: 双击 start.bat
goto end

:restore_and_build
echo.
echo [1/3] 正在安装依赖包...
call npm install
echo.
echo [2/3] 构建生产版本...
call npm run build
echo.
echo [3/3] 打包应用...
call npm run pack-win
echo.
echo ✅ 恢复并打包完成！
echo 📦 打包文件位置: dist\win-unpacked\
goto end

:cancel
echo.
echo 取消恢复操作
goto end

:end
echo.
echo ========================================
echo 操作完成
echo ========================================
pause