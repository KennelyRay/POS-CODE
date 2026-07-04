@echo off
echo Fixing Barcode Scanner Driver...
echo.

echo This script will help restore your barcode scanner functionality
echo that was affected when installing the XP-58 thermal printer driver.
echo.

echo Step 1: Opening Device Manager...
devmgmt.msc

echo.
echo MANUAL STEPS TO FOLLOW:
echo.
echo 1. In Device Manager, look for:
echo    - "libusb-win32 devices" section
echo    - "Universal Serial Bus controllers" section
echo    - "Human Interface Devices" section
echo.
echo 2. Find your barcode scanner device (NOT the XP-58 printer!)
echo    - It might be listed as "USB Input Device"
echo    - Or under "libusb-win32 devices"
echo.
echo 3. Right-click the barcode scanner device
echo 4. Select "Update driver"
echo 5. Choose "Browse my computer for drivers"
echo 6. Select "Let me pick from a list of available drivers"
echo 7. Choose "HID-compliant device" or "USB Input Device"
echo 8. Click "Next" to install
echo.
echo 9. Test your barcode scanner by scanning a barcode
echo.

echo Alternative: If Device Manager doesn't work:
echo 1. Download Zadig tool from: https://zadig.akeo.ie/
echo 2. Run Zadig and check "List All Devices"
echo 3. Find your barcode scanner (VID_2A7A or similar)
echo 4. Change driver TO: usbhid or winusb
echo 5. Click "Replace Driver"
echo.

pause
echo.
echo Testing barcode scanner...
echo Please scan a barcode now to test if it works.
echo If you see the barcode data appear, it's fixed!
echo.
pause

echo.
echo If the barcode scanner still doesn't work:
echo 1. Unplug the barcode scanner
echo 2. Wait 10 seconds
echo 3. Plug it back in
echo 4. Windows should automatically install the correct driver
echo.
pause 