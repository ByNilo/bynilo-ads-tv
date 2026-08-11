@echo off
set NODE_DIR=%~dp0.tools\node
set PATH=%NODE_DIR%;%PATH%
cd /d "%~dp0"
start "Backend BYNILO ADS TV" cmd /k "%~dp0iniciar-backend.bat"
timeout /t 2 /nobreak >nul
start "Frontend SIC" cmd /k "%~dp0iniciar-frontend.bat"
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
pause
