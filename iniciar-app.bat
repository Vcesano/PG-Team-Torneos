@echo off
REM ============================================================
REM   PG Team Tucuman - Torneos
REM   Iniciar la app: mata procesos viejos y arranca Vite limpio
REM ============================================================

title PG Team - App de Torneos (servidor corriendo)

cd /d "%~dp0"

echo.
echo ===============================================================
echo   INICIANDO APP - PG TEAM TUCUMAN
echo ===============================================================
echo.

echo [1/3] Cerrando procesos node anteriores...
powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"

echo [2/3] Esperando que el sistema libere el puerto 5173...
timeout /t 3 /nobreak >nul

echo [3/3] Arrancando servidor Vite...
echo.
echo ===============================================================
echo   IMPORTANTE: NO CIERRES esta ventana mientras uses la app.
echo   Cuando termines, presiona CTRL+C y despues cerra la ventana.
echo ===============================================================
echo.

call npm run dev

echo.
echo Servidor detenido. Podes cerrar esta ventana.
pause
