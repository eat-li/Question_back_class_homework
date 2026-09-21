@echo off
chcp 65001 >nul
title 数学老师综合管理后台 - 一键启动（打包版）
cd /d "%~dp0"

echo ================================================
echo   数学老师综合管理后台  一键启动（生产/日常使用）
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto no_node

where pnpm >nul 2>nul
if errorlevel 1 goto try_pnpm

goto check_deps

:try_pnpm
echo [提示] 未检测到 pnpm，尝试通过 corepack 启用...
corepack enable >nul 2>nul
where pnpm >nul 2>nul
if errorlevel 1 goto no_pnpm

:check_deps
if exist "node_modules" goto check_dist
echo [信息] 首次运行，正在安装依赖，请稍候...
echo.
call pnpm install
if errorlevel 1 goto install_fail

:check_dist
rem 前端已打包（client\dist\index.html 存在）时直接使用，避免每次启动都构建
if exist "client\dist\index.html" goto start_server
echo [信息] 未检测到前端打包产物，正在构建（首次约需 20 秒）...
echo.
call pnpm build
if errorlevel 1 goto build_fail
if not exist "client\dist\index.html" goto build_fail

:start_server
set PORT=4300
echo [信息] 正在启动服务（后端同时托管前端打包文件）...
echo.
echo    访问地址: http://localhost:4300
echo    说明: 前端已使用打包后的 dist 文件，不需要 Vite 开发服务器。
echo    如需开发模式（改动即时生效），请运行「启动-开发模式.bat」。
echo    关闭本窗口或按 Ctrl+C 可停止服务。
echo.

rem 稍等片刻再打开浏览器，避免页面先于服务就绪
start "" cmd /c "timeout /t 3 >nul & start http://localhost:4300"

call pnpm --filter "./server" start
echo.
echo [信息] 服务已停止。
pause
exit /b 0

:no_node
echo [错误] 未检测到 Node.js，请先安装：https://nodejs.org/
echo.
pause
exit /b 1

:no_pnpm
echo [错误] 无法启用 pnpm，请手动执行：npm install -g pnpm
echo.
pause
exit /b 1

:install_fail
echo [错误] 依赖安装失败，请检查网络后重试。
echo.
pause
exit /b 1

:build_fail
echo [错误] 前端构建失败，请查看上方输出中的具体报错。
echo.
pause
exit /b 1
