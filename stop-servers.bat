@echo off
echo ========================================
echo   LabSys - Stopping All Servers
echo ========================================
echo.

echo Stopping Node.js processes...
echo.

REM Kill all node processes (this will stop both backend and frontend)
taskkill /F /IM node.exe 2>nul

if %ERRORLEVEL% EQU 0 (
    echo All servers stopped successfully!
) else (
    echo No running servers found.
)

echo.
echo ========================================
echo   Done!
echo ========================================
echo.
pause
