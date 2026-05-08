@echo off
:: Matar node.exe que ocupe el puerto 3002
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Iniciar API solo si no está corriendo
netstat -ano | findstr ":7000 " | findstr "LISTENING" >nul
if errorlevel 1 (
    powershell -WindowStyle Hidden -Command "Start-Process -FilePath 'F:\BarAvenida\BarAvenida.API\bin\Debug\net8.0\BarAvenida.API.exe' -WorkingDirectory 'F:\BarAvenida\BarAvenida.API' -WindowStyle Hidden"
)

:wait_api
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":7000 " | findstr "LISTENING" >nul
if errorlevel 1 goto wait_api

cd /d "F:\BarAvenida\BarAvenida.Tablet"
start "" /B cmd /c "npm run dev"

timeout /t 3 /nobreak >nul
start chrome "http://localhost:3002"
exit
