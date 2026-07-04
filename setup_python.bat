@echo off
echo =========================================
echo Ken-dal Store POS - Python Setup
echo =========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo Python version:
python --version
echo.

REM Check if pip is available
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: pip is not available
    echo Please reinstall Python with pip included
    pause
    exit /b 1
)

echo Installing Python dependencies for thermal printing...
echo.

REM Upgrade pip first
echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing thermal printer dependencies...
echo This may take a few minutes...
echo.

REM Try installing with pre-compiled wheels first (faster and more reliable)
echo Installing pyusb...
pip install pyusb==1.2.1

if %errorlevel% neq 0 (
    echo Warning: pyusb installation failed, trying alternative method...
    pip install --only-binary=all pyusb==1.2.1
)

echo Installing Pillow (image processing)...
pip install --upgrade Pillow

if %errorlevel% neq 0 (
    echo Warning: Latest Pillow failed, trying compatible version...
    pip install Pillow==10.0.0
    if %errorlevel% neq 0 (
        echo Warning: Pillow 10.0.0 failed, trying older version...
        pip install Pillow==9.5.0
    )
)

echo Installing QR code support...
pip install qrcode==7.4.2

echo Installing python-escpos (thermal printer driver)...
pip install python-escpos==3.0a8

if %errorlevel% neq 0 (
    echo Warning: python-escpos 3.0a8 failed, trying alternative version...
    pip install python-escpos==2.2.0
)

echo Installing argparse...
pip install argparse==1.4.0

echo.
echo =========================================
echo Checking installation...
echo =========================================
echo.

REM Test Python imports
python -c "import usb.core; print('✓ pyusb installed successfully')" 2>nul
if %errorlevel% neq 0 (
    echo ✗ pyusb installation issue detected
    echo.
    echo Trying to install libusb drivers...
    echo Please download and install libusb-win32 if printing doesn't work:
    echo https://sourceforge.net/projects/libusb-win32/
    echo.
)

python -c "import PIL; print('✓ Pillow installed successfully')" 2>nul
if %errorlevel% neq 0 (
    echo ✗ Pillow installation issue detected
    echo QR codes may not work properly
) else (
    echo ✓ Pillow installed successfully
)

python -c "import qrcode; print('✓ QR code support installed')" 2>nul
if %errorlevel% neq 0 (
    echo ✗ QR code support installation failed
) else (
    echo ✓ QR code support installed successfully
)

python -c "import escpos; print('✓ python-escpos installed successfully')" 2>nul
if %errorlevel% neq 0 (
    echo ✗ python-escpos installation issue detected
    echo Thermal printing may not work properly
) else (
    echo ✓ python-escpos installed successfully
)

echo.
echo =========================================
echo Installation completed!
echo =========================================
echo.

REM Test the thermal printer setup
echo Testing thermal printer detection...
python thermal_printer.py list

if %errorlevel% neq 0 (
    echo.
    echo Warning: Could not test printer detection
    echo This might be normal if no thermal printer is connected
    echo or if there are missing drivers
)

echo.
echo Setup complete! You can now use thermal printing.
echo.
echo Commands available:
echo   python thermal_printer.py list    - List available printers
echo   python thermal_printer.py test    - Print test receipt
echo   python thermal_printer.py drawer  - Open cash drawer
echo.
echo If you encounter issues:
echo 1. Make sure your thermal printer is connected
echo 2. Install printer drivers from manufacturer
echo 3. For USB issues, install libusb-win32 drivers
echo 4. Try running as Administrator
echo.
pause 