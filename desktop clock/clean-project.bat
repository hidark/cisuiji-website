@echo off
echo ========================================
echo  Desktop Clock - 项目清理工具
echo ========================================
echo.
echo 此工具将帮助您清理项目中的临时文件，节省磁盘空间
echo.
echo 当前项目大小估算：
echo   - node_modules: ~1GB (依赖包)
echo   - dist:         ~250MB (打包输出)
echo   - build:        ~5MB (构建输出)
echo   - 总计可清理:   ~1.25GB
echo.
echo 选择清理选项:
echo [1] 清理构建文件 (build + dist) - 节省 ~255MB
echo [2] 清理依赖包 (node_modules) - 节省 ~1GB  
echo [3] 完全清理 (所有临时文件) - 节省 ~1.25GB
echo [4] 仅清理缓存文件 - 节省少量空间
echo [5] 取消
echo.
set /p choice="请选择 (1-5): "

if "%choice%"=="1" goto clean_build
if "%choice%"=="2" goto clean_node_modules
if "%choice%"=="3" goto clean_all
if "%choice%"=="4" goto clean_cache
if "%choice%"=="5" goto cancel

:clean_build
echo.
echo 正在清理构建文件...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist nul del /q nul
echo ✅ 构建文件清理完成！
echo 💡 如需重新构建，请运行: npm run build
goto end

:clean_node_modules
echo.
echo ⚠️  警告：清理依赖包后需要重新安装才能运行项目
set /p confirm="确定继续吗? (y/N): "
if /i not "%confirm%"=="y" goto cancel
echo.
echo 正在清理依赖包...
if exist node_modules rmdir /s /q node_modules
echo ✅ 依赖包清理完成！
echo 💡 如需重新安装，请运行: npm install
goto end

:clean_all
echo.
echo ⚠️  警告：将清理所有临时文件，包括依赖包
set /p confirm="确定继续吗? (y/N): "
if /i not "%confirm%"=="y" goto cancel
echo.
echo 正在执行完全清理...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist node_modules rmdir /s /q node_modules
if exist nul del /q nul
if exist package-lock.json del /q package-lock.json
echo ✅ 完全清理完成！
echo 💡 如需恢复项目，请运行: npm install
goto end

:clean_cache
echo.
echo 正在清理缓存文件...
npm cache clean --force 2>nul
if exist nul del /q nul
echo ✅ 缓存清理完成！
goto end

:cancel
echo.
echo 取消清理操作
goto end

:end
echo.
echo ========================================
echo  清理完成
echo ========================================
echo.
echo 项目核心文件已保留：
echo   ✅ src/ (源代码)
echo   ✅ public/ (配置文件)
echo   ✅ package.json (依赖配置)
echo   ✅ README.md (使用说明)
echo.
pause