@echo off
set NODE_DIR=%~dp0.tools\node
set PATH=%NODE_DIR%;%PATH%
cd /d "%~dp0SIC"
echo Iniciando frontend SIC en http://localhost:5173
npm run dev
pause
