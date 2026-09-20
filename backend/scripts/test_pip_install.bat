@echo off
set VENV_DIR=C:\Users\rsang\.gemini\antigravity\brain\37ae97ad-e3c7-44f4-835e-60dd7904d8ed\scratch\clean-venv

echo Creating clean venv at %VENV_DIR%...
C:\Users\rsang\AppData\Local\Programs\Python\Python312\python.exe -m venv %VENV_DIR%

echo Running pip install...
%VENV_DIR%\Scripts\pip.exe install --no-cache-dir -r requirements.txt
