@echo off
title VisionTouch Control Panel
echo =======================================================
echo   VisionTouch - Enterprise AI Gestures Controller
echo =======================================================
echo.

:: Detect Python environment
set PYTHON_EXE=python
if exist .venv\Scripts\python.exe (
    set PYTHON_EXE=.venv\Scripts\python.exe
    echo [INFO] Virtual environment detected.
) else (
    echo [WARNING] Virtual environment not found, using global Python.
)

:: Launch the default web browser to the dashboard
echo [INFO] Opening VisionTouch Web Dashboard...
start https://vision-touch.netlify.app/

:: Wait 1 second
timeout /t 1 /nobreak > nul

:: Run the Python backend inline
echo [INFO] Starting Python backend server...
echo [INFO] Press Ctrl+C in this window to stop the backend.
echo.
%PYTHON_EXE% main.py

pause
