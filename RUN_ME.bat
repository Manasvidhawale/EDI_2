@echo off
title RailSense AI — ML Bridge
color 0B

echo.
echo  ==========================================
echo   RailSense AI - Railway Monitoring System
echo  ==========================================
echo.
echo  Starting ML Prediction Bridge...
echo  Press Ctrl+C to stop.
echo.

cd /d "%~dp0"
call venv\Scripts\activate
python predict.py

pause
