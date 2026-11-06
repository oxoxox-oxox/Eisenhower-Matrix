@echo off
taskkill /f /im EisenhowerMatrix.exe 2>nul
taskkill /f /im "四象限时间管理.exe" 2>nul
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1"
