@echo off
setlocal
title Pause ^& Plate Scanner Bridge
echo.
echo Installation du Scanner Bridge Windows...
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALLER-WINDOWS.ps1"
echo.
pause
endlocal
