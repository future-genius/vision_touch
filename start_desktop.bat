@echo off
title VisionTouch Desktop App
echo =======================================================
echo   VisionTouch - Native AI Gestures Desktop App
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

echo [INFO] Launching VisionTouch app window...
%PYTHON_EXE% app_desktop.py
