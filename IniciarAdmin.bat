@echo off
taskkill /F /IM BarAvenida.API.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

powershell -WindowStyle Hidden -Command "Start-Process -FilePath 'F:\BarAvenida\BarAvenida.API\bin\Debug\net8.0\BarAvenida.API.exe' -WorkingDirectory 'F:\BarAvenida\BarAvenida.API' -WindowStyle Hidden"

:wait_api
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":7000" | findstr "LISTENING" >nul
if errorlevel 1 goto wait_api

cd /d "F:\BarAvenida\BarAvenida.Desktop"
start "" /B cmd /c "npm start"
exit
