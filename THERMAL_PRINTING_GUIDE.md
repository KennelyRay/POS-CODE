# 🖨️ Thermal Printing Guide - Ken-dal Store POS

This guide will help you set up and configure thermal printing for your POS system.

## 📋 Prerequisites

### Software Requirements
- **Python 3.8+** installed on your system
- **Node.js 16+** for the main POS application
- **Compatible thermal printer** (ESC/POS compatible)

### Hardware Requirements
- **Thermal printer** connected via USB or Serial port
- **Thermal paper rolls** (58mm or 80mm width)
- **USB cable** or **Serial cable** for printer connection

## 🔧 Supported Printers

### ✅ Fully Tested
- **Epson TM-T88V** (USB/Serial/Ethernet)
- **Epson TM-T20** (USB/Serial)
- **XP-58 Series** (USB)
- **Star TSP143** (USB/Ethernet)

### ✅ Compatible (ESC/POS Standard)
- Most thermal receipt printers that support ESC/POS commands
- Generic 58mm thermal printers
- POS-80 series thermal printers

## 🚀 Quick Setup

### Step 1: Install Python Dependencies

**Windows (Recommended):**
```bash
# Run the automated setup script
setup_python.bat
```

**Manual Installation:**
```bash
# Install required packages
pip install python-escpos==3.0a9
pip install pyusb==1.2.1
pip install Pillow==10.0.1
pip install qrcode==7.4.2
```

### Step 2: Connect Your Printer

1. **USB Connection:**
   - Connect printer to USB port
   - Turn on the printer
   - Windows should detect it automatically

2. **Serial Connection:**
   - Connect via serial/RS232 cable
   - Note the COM port number (e.g., COM1, COM2)

### Step 3: Test Connection

```bash
# List available printers
python thermal_printer.py list

# Test print a sample receipt
python thermal_printer.py test
```

### Step 4: Configure in POS System

1. Start the POS application
2. Go to **Settings** → **Thermal Printer**
3. Click **Refresh Printers** to scan for devices
4. Select your printer from the dropdown
5. Click **Test Print** to verify

## 🖨️ Printing Features

### Enhanced Print Quality
- **Maximum Darkness**: Uses enhanced ESC/POS commands for darker prints
- **Anti-Fade Technology**: Specialized thermal head control
- **Double-Strike Printing**: Each line printed twice for boldness
- **Density Optimization**: Automatic print density adjustment

### Receipt Content
- **Store Information**: Name, address, contact details
- **Transaction Details**: Date, time, receipt ID
- **Itemized List**: Products, quantities, prices
- **Payment Summary**: Subtotal, tax, total, payment, change
- **QR Code**: Optional digital receipt verification
- **Professional Footer**: Thank you message

### Cash Drawer Integration
- **Automatic Opening**: Cash drawer opens after successful payment
- **Manual Control**: Open drawer via Settings or API
- **ESC/POS Commands**: Standard cash drawer pulse signals

## 🔧 Troubleshooting

### Printer Not Detected

**Solution 1: Check USB Connection**
```bash
# On Windows, check Device Manager
# Look for "USB Printing Support" or your printer model
python thermal_printer.py list
```

**Solution 2: Driver Issues**
- Download latest drivers from printer manufacturer
- Try different USB port
- Restart printer and computer

**Solution 3: Serial Connection**
```bash
# Check COM ports on Windows
# Ensure correct baudrate (usually 9600)
python thermal_printer.py list
```

### Faded or Light Prints

**Solution 1: Printer Settings**
- Check thermal paper quality (use high-grade thermal paper)
- Clean print head with isopropyl alcohol
- Adjust print density in printer settings

**Solution 2: Paper Issues**
- Ensure paper is loaded correctly (thermal side down)
- Check paper expiration date
- Try different thermal paper brand

**Solution 3: Software Settings**
The Python script automatically applies maximum heat settings:
- Enhanced thermal head activation
- Maximum print density
- Double-strike mode for bold text

### Print Quality Issues

**Blurry Text:**
- Check print head alignment
- Clean print head mechanism
- Verify thermal paper width (58mm vs 80mm)

**Incomplete Prints:**
- Check paper roll isn't jammed
- Verify sufficient paper remaining
- Test with different USB cable

### Connection Errors

**USB Permission Issues (Linux/Mac):**
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER
# Restart terminal session
```

**Python Package Issues:**
```bash
# Reinstall packages
pip uninstall python-escpos pyusb
pip install python-escpos==3.0a9 pyusb==1.2.1
```

**Windows libusb Issues:**
1. Download libusb-win32 driver
2. Use Zadig tool to install generic USB driver
3. Restart computer

## 📚 API Reference

### Command Line Interface

```bash
# List all available printers
python thermal_printer.py list

# Print test receipt
python thermal_printer.py test [--printer "Printer Name"]

# Print custom receipt
python thermal_printer.py print --data '{"id":"12345","total":99.99,...}'

# Open cash drawer
python thermal_printer.py drawer [--printer "Printer Name"]
```

### Receipt Data Format

```json
{
  "id": "RECEIPT-12345",
  "date": "2024-01-15T10:30:00Z",
  "storeName": "Ken-dal Store",
  "storeAddress": "123 Main Street",
  "items": [
    {
      "name": "Product 1",
      "quantity": 2,
      "price": 15.50
    }
  ],
  "total": 31.00,
  "customerMoney": 50.00,
  "change": 19.00
}
```

### Integration with POS

The thermal printing system integrates seamlessly with the POS:

1. **Automatic Printing**: Receipts print automatically after checkout
2. **Printer Selection**: Choose default printer in Settings
3. **Test Printing**: Verify printer functionality from Settings
4. **Error Handling**: Graceful fallback if printing fails
5. **Status Indicators**: Real-time printer status in UI

## 🎯 Best Practices

### Paper Management
- Use high-quality thermal paper for best results
- Store paper rolls in cool, dry place
- Check paper width matches printer specifications

### Printer Maintenance
- Clean print head monthly with isopropyl alcohol
- Keep printer dust-free
- Check cable connections regularly

### Software Updates
- Keep Python packages updated
- Update printer drivers as needed
- Test printing after system updates

### Performance Optimization
- Use USB 2.0+ ports for reliable connection
- Avoid USB hubs when possible
- Keep printer drivers current

## 📞 Support

### Getting Help

1. **Check Status**: Use `python thermal_printer.py list` to verify connection
2. **Test Print**: Run `python thermal_printer.py test` for basic functionality
3. **Review Logs**: Check console output for error messages
4. **Documentation**: Refer to this guide and README.md

### Common Error Codes

- **USB Error**: Printer not connected or wrong driver
- **Permission Error**: Need administrator rights (Windows) or user groups (Linux)
- **Format Error**: Invalid receipt data format
- **Communication Error**: Serial port or baudrate mismatch

### Reporting Issues

When reporting problems, include:
- Printer model and connection type
- Operating system version
- Python version (`python --version`)
- Error messages from console
- Steps to reproduce the issue

---

**🎉 You're ready to start thermal printing!**

For additional support, check the main README.md or create an issue in the repository. 