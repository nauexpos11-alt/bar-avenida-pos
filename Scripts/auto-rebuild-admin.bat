@echo off
REM ============================================================================
REM  Bar Avenida - Auto rebuild Admin (sin admin)
REM  Hace npm run build y copia a wwwroot principal.
REM  Para deploy a Program Files + reinicio del servicio se requiere admin
REM  separado (ver auto-rebuild-admin-elevado.bat).
REM ============================================================================

cd /d F:\BarAvenida\BarAvenida.Admin

echo.
echo === [1/2] Compilando Admin ===
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FALLO - revisa el error arriba
    pause
    exit /b 1
)

echo.
echo === [2/2] Copiando bundle a wwwroot principal (F:) ===
if exist "F:\BarAvenida\BarAvenida.API\wwwroot\admin" rmdir /s /q "F:\BarAvenida\BarAvenida.API\wwwroot\admin"
mkdir "F:\BarAvenida\BarAvenida.API\wwwroot\admin"
xcopy /e /y /q "F:\BarAvenida\BarAvenida.Admin\dist\*" "F:\BarAvenida\BarAvenida.API\wwwroot\admin\"

echo.
echo ============================================
echo   BUILD + COPY A F: COMPLETADO
echo ============================================
echo.
echo Bundle generado en: F:\BarAvenida\BarAvenida.Admin\dist\
echo Copiado a:          F:\BarAvenida\BarAvenida.API\wwwroot\admin\
echo.
echo SIGUIENTE PASO (requiere PowerShell admin):
echo   Stop-Service BarAvenidaAPI
echo   Remove-Item -Recurse -Force "C:\Program Files\Bar Avenida\Server\wwwroot\admin"
echo   Copy-Item -Recurse -Force "F:\BarAvenida\BarAvenida.Admin\dist\*" "C:\Program Files\Bar Avenida\Server\wwwroot\admin\"
echo   Start-Service BarAvenidaAPI
echo.
timeout /t 8
