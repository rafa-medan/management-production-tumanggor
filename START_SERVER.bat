@echo off
REM ============================================
REM    MULTICORP SERVER STARTER
REM    Jalankan server lokal di port 8000
REM ============================================
REM
REM Apa yang akan terjadi:
REM - Server akan berjalan di: http://127.0.0.1:8000
REM - Data tersimpan di folder local-data
REM - Buka browser: http://localhost:8000/index-portal.html
REM - Untuk stop: Tekan Ctrl+C
REM
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                 MultiCorp Server Launcher                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Memulai server lokal...
echo.
echo URL: http://localhost:8000
echo.
echo Tekan Ctrl+C untuk menghentikan server
echo.
echo ════════════════════════════════════════════════════════════
echo.

node local-server.js

pause