@echo off
echo 🧹 Limpiando procesos...
taskkill /F /IM node.exe /T 2>nul
exit /b 0
