@echo off
echo ========================================
echo   LabSys - Starting Servers
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Checking Node.js version...
node --version
echo.

echo [2/4] Starting Backend Server...
echo Starting on http://localhost:5000
start "LabSys Backend" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 3 /nobreak >nul
echo Backend server started!
echo.

echo [3/4] Starting Frontend Server...
echo Starting on http://localhost:5173
start "LabSys Frontend" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 3 /nobreak >nul
echo Frontend server started!
echo.

echo [4/4] Servers are starting...
echo.
echo ========================================
echo   Servers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to open the application in your browser...
pause >nul

REM Open the application in default browser
start http://localhost:5173

echo.
echo ========================================
echo   Application opened in browser!
echo ========================================
echo.
echo To stop the servers:
echo - Close the Backend and Frontend terminal windows
echo - Or press Ctrl+C in each window
echo.
echo This window will close in 5 seconds...
timeout /t 5 /nobreak >nul
