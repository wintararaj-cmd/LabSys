@echo off
echo ========================================
echo   LabSys - Starting Frontend Server
echo ========================================
echo.

cd /d %~dp0client

echo Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo Starting Frontend Server...
echo Server will run on http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
