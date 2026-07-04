@echo off
echo Installing Python dependencies for Ken-dal Store POS thermal printing...
echo.

REM Try different Python commands
set PYTHON_CMD=

for %%p in (python python3 py) do (
    %%p --version >nul 2>&1
    if !errorlevel! equ 0 (
        set PYTHON_CMD=%%p
        goto :found_python
    )
)

REM Try specific Python paths
for %%p in ("C:\Python313\python.exe" "C:\Python312\python.exe" "C:\Python311\python.exe") do (
    %%p --version >nul 2>&1
    if !errorlevel! equ 0 (
        set PYTHON_CMD=%%p
        goto :found_python
    )
)

echo ERROR: Python not found! Please install Python 3.11+ first.
echo Download from: https://www.python.org/downloads/
pause
exit /b 1

:found_python
echo Found Python: %PYTHON_CMD%
echo.

echo Installing required packages...
%PYTHON_CMD% -m pip install --upgrade pip
%PYTHON_CMD% -m pip install pywin32
%PYTHON_CMD% -m pip install python-escpos
%PYTHON_CMD% -m pip install pyusb

echo.
echo Installation complete!
echo Your thermal printer should now work with the POS system.
echo.
pause 