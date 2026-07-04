# Ken-dal Store POS

Desktop point-of-sale software built with React, TypeScript, Electron, and Python printer helpers. It is designed for day-to-day store operations such as checkout, product management, receipt printing, customer credit tracking, and sales reporting.

## Overview

- Electron desktop app with a React frontend
- Product and category management with import/export tools
- Basket workflow with barcode scanning support
- Printable receipts and printable full product price lists
- Customer credit tracking and payment history
- Gross sales, receipts, and sales record reporting
- Python-based thermal printer integration for ESC/POS-compatible printers

## Tech Stack

- React 18
- TypeScript
- Material UI
- Electron
- Electron Builder
- Python printer helper scripts

## Repository Structure

```text
src/
  components/    Shared UI shell and routing helpers
  contexts/      App-level providers such as printer context
  pages/         POS modules like Basket, Products, Reports, Settings
  types/         TypeScript declarations
  App.tsx        Main app setup and shared contexts

public/
  electron.js    Electron main process
  preload.js     Electron preload bridge
  index.html     App HTML template

assets/
  icon.png       Application icon used for packaged builds

*.py
  Printer utilities and direct printer integration scripts
```

## Main Features

### Store Operations

- Fast basket workflow for cashier use
- Product search and barcode-based item lookup
- Receipt generation and reprinting
- Customer credit management with payment tracking

### Inventory and Pricing

- Category and product management
- CSV/JSON import and export helpers
- Printable product price list for offline/power-loss reference

### Reporting

- Sales records and receipt history
- Gross sales reporting
- Export-ready data views for store operations

### Printing

- Thermal receipt printing via Python helper scripts
- Cash drawer support
- Print preview and browser-style printing for the full product price list

## Getting Started

### Prerequisites

- Node.js 16 or newer
- npm
- Python 3.8 or newer
- Windows is the primary packaging target for the current Electron release setup

### Install Dependencies

```bash
npm install
```

### Optional Python Printer Setup

If you want to use the thermal printer tools locally:

```bash
setup_python.bat
```

Or install the Python packages manually:

```bash
pip install python-escpos==3.0a9 pyusb==1.2.1 Pillow==10.0.1 qrcode==7.4.2
```

### Run in Development

```bash
npm start
```

This starts the React development server. The Electron main process lives in `public/electron.js`.

## Build Commands

### Web Production Build

```bash
npm run build
```

Creates the web production output in `build/`.

### Electron Desktop Build

```bash
npm run build:electron
```

This runs the React production build first, then packages the desktop app using `electron-builder`.

Current packaged output:

- `dist-electron-<version>-installer/`
- Windows NSIS installer artifacts such as `.exe` and `.blockmap`

## Thermal Printing Notes

- The app includes Python scripts for printer discovery, receipt printing, and cash drawer actions.
- Packaged builds include the required Python helper scripts as extra resources.
- For detailed printer setup and troubleshooting, see [THERMAL_PRINTING_GUIDE.md](THERMAL_PRINTING_GUIDE.md).

## GitHub Releases

This repository includes a GitHub Actions workflow for Electron releases.

### How releases work

- Push a tag in the format `v*.*.*`, for example `v1.21.0`
- GitHub Actions builds the Windows Electron installer
- The workflow attaches the generated installer artifacts to a GitHub Release

### Example release commands

```bash
git tag v1.21.0
git push origin v1.21.0
```

You can also run the workflow manually from the GitHub Actions tab to build release artifacts without tagging.

## Contributing

1. Create a feature branch
2. Make and test your changes
3. Open a pull request with a clear summary

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
