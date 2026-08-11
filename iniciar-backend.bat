@echo off
set NODE_DIR=%~dp0.tools\node
set PATH=%NODE_DIR%;%PATH%
cd /d "%~dp0"
echo Iniciando backend BYNILO ADS TV en http://localhost:3000
node server.js
pause
