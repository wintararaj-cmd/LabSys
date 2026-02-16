@echo off
echo ========================================
echo   LabSys - Installation Script
echo ========================================
echo.

echo This script will install all dependencies for LabSys
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo npm version:
npm --version
echo.

echo ========================================
echo   Installing Backend Dependencies
echo ========================================
echo.

cd /d %~dp0server
echo Installing in: %CD%
echo.

call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)

echo.
echo Backend dependencies installed successfully!
echo.

echo ========================================
echo   Installing Frontend Dependencies
echo ========================================
echo.

cd /d %~dp0client
echo Installing in: %CD%
echo.

call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo Frontend dependencies installed successfully!
echo.

echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your .env file in the server directory
echo 2. Set up your PostgreSQL database
echo 3. Run the database schema (server/models/schema.sql)
echo 4. Run start-servers.bat to start the application
echo.
echo For detailed instructions, see QUICK_START.md
echo.
pause
