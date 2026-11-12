@echo off
title ClipNova AI Launcher
echo ========================================================
echo  ClipNova AI - Video Repurposing & Auto-Publishing Studio
echo ========================================================
echo.
echo 1. Launching FastAPI Backend on http://localhost:8000 ...
start "ClipNova Backend" cmd /c "run_backend.bat"

timeout /t 2 >nul

echo 2. Launching Vite React Frontend on http://localhost:5173 ...
start "ClipNova Frontend" cmd /c "run_frontend.bat"

echo.
echo All services launched! Open http://localhost:5173 in your browser.
echo.
pause
