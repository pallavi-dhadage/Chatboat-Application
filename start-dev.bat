@echo off
setlocal
cd /d %~dp0backend-flask
start cmd /k "python run_simple.py"
cd /d %~dp0frontend
if not exist node_modules (npm install)
start cmd /k "npm start"
echo Backend and frontend started in new terminals.
