@echo off
REM ============================================================
REM   PG Team Tucuman - Torneos
REM   Detener la app: mata todos los procesos node colgados
REM ============================================================

title PG Team - Deteniendo app

echo.
echo Cerrando procesos node y liberando el puerto 5173...
powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"

echo Listo. Todos los servidores detenidos.
timeout /t 2 /nobreak >nul
