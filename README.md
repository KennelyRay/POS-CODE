# Ken-dal Store POS System

A modern Point of Sale (POS) system built with React, TypeScript, and Electron featuring **Python-powered thermal printing** for professional receipt printing.

## 🚀 Features

- **Modern POS Interface**: Clean, intuitive design for efficient sales processing
- **🔥 Python Thermal Printing**: Advanced ESC/POS thermal printing with enhanced darkness control
- **Product Management**: Add, edit, and organize products by categories
- **Sales Tracking**: Comprehensive sales reports and analytics  
- **Customer Credit System**: Track customer credit and purchases
- **Receipt Management**: Digital receipt storage and thermal printing
- **Staff Management**: User authentication and staff access control
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Data Management**: Export and import capabilities for business data
- **💰 Auto Cash Drawer**: Automatically opens cash drawer upon purchase confirmation via thermal printer

## 🖨️ Python Thermal Printing System

This POS system features an advanced **Python-based thermal printing engine** that provides:

### ✨ Advanced Features
- **Maximum Print Darkness**: Enhanced ESC/POS commands for darker, clearer prints
- **Anti-Fade Technology**: Specialized thermal head control to eliminate faded receipts
- **Direct Printer Communication**: Bypasses Windows drivers for better control
- **Multiple Printer Support**: Auto-detection of USB, Serial, and Network thermal printers
- **Enhanced Heat Settings**: Optimized thermal head activation for consistent quality
- **QR Code Receipts**: Optional QR codes for digital receipt verification

### 🔧 Supported Thermal Printers
- **Epson TM Series** (TM-T88, TM-T20, etc.)
- **XP-58** and compatible 58mm thermal printers
- **Star Micronics** thermal printers
- **Generic ESC/POS** compatible thermal printers

## 📦 Installation

### Prerequisites
1. **Node.js 16+** - Download from [nodejs.org](https://nodejs.org/)
2. **Python 3.8+** - Download from [python.org](https://python.org/)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pos-system
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Set up Python thermal printing** (Windows)
   ```bash
   setup_python.bat
   ```
   
   Or manually install Python dependencies:
   ```bash
   pip install python-escpos==3.0a9 pyusb==1.2.1 Pillow==10.0.1 qrcode==7.4.2
   ```

4. **Test thermal printer connection**
   ```bash
   python thermal_printer.py list
   python thermal_printer.py test
   ```

5. **Start the application**
   ```bash
   npm start
   ```

## 🖨️ Thermal Printer Configuration

### Automatic Detection
The system automatically detects connected thermal printers including:
- USB thermal printers (plug-and-play)
- Network thermal printers (configure IP in settings)
- Serial thermal printers (configure COM port)

### Manual Configuration
If your printer isn't automatically detected:

1. **Check USB Connection**
   ```bash
   python thermal_printer.py list
   ```

2. **Test Print**
   ```bash
   python thermal_printer.py test
   ```

3. **Print Custom Receipt**
   ```bash
   python thermal_printer.py print --data '{"storeName":"Test Store","total":100}'
   ```

### Troubleshooting Faded Prints

The Python thermal printing system includes **anti-fade technology**:

- **Maximum Heat Settings**: Enhanced thermal head activation
- **Print Density Control**: Optimized for darker output
- **Double-Strike Mode**: Prints each line twice for boldness
- **Emphasized Printing**: ESC/POS bold commands

If prints are still faded:
1. Check thermal paper quality (use high-quality thermal paper)
2. Clean thermal print head with isopropyl alcohol
3. Ensure proper cable connections
4. Update thermal printer drivers

## 🖥️ Usage

### Getting Started
1. **Login**: Use default credentials (admin/admin) or create new staff accounts
2. **Setup Store**: Configure store information in Settings
3. **Configure Printer**: Select thermal printer in Settings > Thermal Printer
4. **Add Products**: Create product categories and add inventory
5. **Process Sales**: Use the intuitive basket interface for transactions
6. **Print Receipts**: Automatic thermal printing after checkout

### Key Components

#### 📊 Dashboard
- Real-time sales overview
- Quick access to all features
- Modern, responsive design

#### 🛍️ Point of Sale
- Product search and barcode scanning
- Category-based product browsing
- Shopping basket with quantity/price adjustments
- Customer payment processing
- **Automatic thermal receipt printing**

#### 📦 Product Management
- Category creation and management
- Product information (name, price, stock, barcodes)
- Bulk import/export capabilities
- Inventory tracking

#### 📈 Sales & Reports
- Daily, weekly, monthly sales reports
- Transaction history
- Customer credit tracking
- Export capabilities for accounting

#### ⚙️ Settings
- Store information configuration
- **Thermal printer selection and testing**
- Theme customization
- Data backup and restore
- User management

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── contexts/           # React context providers
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component

public/
├── electron.js         # Electron main process
├── preload.js         # Electron preload script
└── index.html         # HTML template

thermal_printer.py      # Python thermal printing engine
requirements.txt        # Python dependencies
setup_python.bat       # Python setup script
```

## 🛠️ Development

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run electron` - Start Electron app
- `npm run electron-dev` - Start Electron in development mode
- `npm run dist` - Build and package for distribution

### Python Thermal Printing API

The `thermal_printer.py` script provides:

```bash
# List available printers
python thermal_printer.py list

# Print receipt
python thermal_printer.py print --data '{"id":"123","total":100,"items":[...]}'

# Test print
python thermal_printer.py test

# Open cash drawer
python thermal_printer.py drawer
```

### Built With

- **React 18** - UI library
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **Electron** - Desktop app framework
- **Python** - Thermal printing engine
- **ESC/POS** - Thermal printer commands

## 📱 Platform Support

- ✅ Windows 10/11
- ✅ macOS 10.14+
- ✅ Linux (Ubuntu, Debian, etc.)

## 🔧 Configuration

### Store Settings
Configure your store information in the Settings page:
- Store name and address
- Contact information
- Theme preferences
- **Default thermal printer selection**

### Thermal Printer Settings
The Python thermal printing system automatically optimizes for:
- **Print Density**: Maximum darkness settings
- **Heat Control**: Enhanced thermal head activation
- **Font Selection**: Optimized for thermal printers
- **Paper Size**: 58mm thermal paper (configurable)

### Data Management
- **Export**: Save sales data and products to CSV/JSON
- **Import**: Restore data from backup files
- **Clear**: Reset application data (with confirmation)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Test thermal printing functionality
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For thermal printing issues:
1. Run `python thermal_printer.py test` to verify printer connection
2. Check that Python dependencies are installed correctly
3. Ensure thermal printer is compatible with ESC/POS commands
4. Contact support with printer model and error messages

For general support:
- Create an issue in the repository
- Check the documentation
- Review existing issues for solutions

## 🎯 Roadmap

- [ ] Network thermal printer support
- [ ] Receipt templates customization
- [ ] Cloud synchronization
- [ ] Advanced reporting
- [ ] Multi-store support
- [ ] Mobile companion app
- [ ] Inventory alerts
- [ ] Customer loyalty program

---

**Powered by Python Thermal Printing Technology** 🐍🖨️ 