@echo off
echo Setting up Electron app icons...

:: Check if ImageMagick is available
where magick >nul 2>nul
if %errorlevel% neq 0 (
    echo ImageMagick not found. Please install ImageMagick first.
    echo Download from: https://imagemagick.org/script/download.php#windows
    echo.
    echo Alternative: Use online converters to create the following files:
    echo - assets/icon.ico ^(Windows - 256x256 pixels^)
    echo - assets/icon.icns ^(macOS - use online converter^)  
    echo - assets/icon.png ^(Linux - 512x512 pixels^)
    echo.
    echo Use your public/app-icon.svg as the source image.
    pause
    exit /b 1
)

:: Create assets directory if it doesn't exist
if not exist "assets" mkdir assets

:: Convert SVG to different formats
echo Converting SVG to ICO for Windows...
magick public/app-icon.svg -resize 256x256 -background transparent assets/icon.ico

echo Converting SVG to PNG for Linux...
magick public/app-icon.svg -resize 512x512 -background transparent assets/icon.png

echo Converting SVG to PNG for macOS conversion...
magick public/app-icon.svg -resize 1024x1024 -background transparent assets/icon-1024.png

echo.
echo Icons created! 
echo - Windows: assets/icon.ico
echo - Linux: assets/icon.png
echo - For macOS: Convert assets/icon-1024.png to ICNS format using online tools
echo   Recommended: https://convertico.com/ or https://cloudconvert.com/
echo   Save as: assets/icon.icns
echo.
echo Your app icon is now configured for all platforms!
pause 