#!/usr/bin/env python3
"""
Windows Printer Integration for Ken-dal Store POS System
Uses Windows print dialog to print receipts on any installed printer
"""

import sys
import json
import argparse
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional
import tempfile
import os
import subprocess

try:
    import win32print
    import win32api
    import win32con
    import win32gui
    import win32ui
    from win32comext import shell
    from win32comext.shell import shellcon
except ImportError:
    print("Installing required Windows packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pywin32"])
    import win32print
    import win32api
    import win32con
    import win32gui
    import win32ui
    from win32comext import shell
    from win32comext.shell import shellcon

class WindowsPrinter:
    """Windows printer manager using system print dialog"""
    
    def __init__(self):
        self.selected_printer = None
        
    def find_printers(self) -> List[Dict[str, Any]]:
        """Get all installed Windows printers"""
        printers = []
        
        try:
            # Get default printer
            default_printer = win32print.GetDefaultPrinter()
            
            # Enumerate all printers
            printer_enum = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)
            
            for printer in printer_enum:
                printer_name = printer[2]  # Printer name
                is_default = printer_name == default_printer
                
                try:
                    # Get printer info
                    printer_handle = win32print.OpenPrinter(printer_name)
                    printer_info = win32print.GetPrinter(printer_handle, 2)
                    win32print.ClosePrinter(printer_handle)
                    
                    printer_data = {
                        'type': 'windows',
                        'name': printer_name,
                        'driver': printer_info.get('pDriverName', 'Unknown'),
                        'port': printer_info.get('pPortName', 'Unknown'),
                        'location': printer_info.get('pLocation', ''),
                        'status': 'Ready' if printer_info.get('Status', 0) == 0 else 'Not Ready',
                        'isDefault': is_default,
                        'connection': printer_info.get('pPortName', 'Unknown')
                    }
                    printers.append(printer_data)
                    
                except Exception as e:
                    # Fallback printer info
                    printer_data = {
                        'type': 'windows',
                        'name': printer_name,
                        'driver': 'Unknown',
                        'port': 'Unknown',
                        'location': '',
                        'status': 'Unknown',
                        'isDefault': is_default,
                        'connection': 'Unknown'
                    }
                    printers.append(printer_data)
                    
        except Exception as e:
            print(f"Error enumerating printers: {e}", file=sys.stderr)
            
        return printers
    
    def create_receipt_html(self, receipt_data: Dict[str, Any]) -> str:
        """Create HTML receipt for printing"""
        store_name = receipt_data.get('storeName', 'Ken-dal Store')
        store_address = receipt_data.get('storeAddress', '123 Main Street')
        receipt_id = receipt_data.get('id', 'N/A')
        date = receipt_data.get('date', datetime.now().isoformat())
        items = receipt_data.get('items', [])
        total = float(receipt_data.get('total', 0))
        customer_money = float(receipt_data.get('customerMoney', total))
        change = float(receipt_data.get('change', 0))
        
        # Parse date
        try:
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            formatted_date = parsed_date.strftime('%Y-%m-%d %H:%M:%S')
        except:
            formatted_date = str(date)
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt {receipt_id}</title>
    <style>
        @page {{
            size: 80mm auto;
            margin: 10mm 5mm;
        }}
        body {{
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            margin: 0;
            padding: 0;
            width: 70mm;
        }}
        .header {{
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
        }}
        .store-name {{
            font-size: 16px;
            font-weight: bold;
        }}
        .receipt-title {{
            font-size: 14px;
            margin: 10px 0;
        }}
        .separator {{
            border-top: 1px dashed #000;
            margin: 5px 0;
        }}
        .receipt-info {{
            margin: 10px 0;
        }}
        .items {{
            margin: 10px 0;
        }}
        .item {{
            margin: 5px 0;
        }}
        .item-name {{
            font-weight: bold;
        }}
        .item-details {{
            text-align: right;
        }}
        .summary {{
            margin-top: 10px;
            border-top: 1px solid #000;
            padding-top: 5px;
        }}
        .total {{
            font-size: 14px;
            font-weight: bold;
        }}
        .footer {{
            text-align: center;
            margin-top: 15px;
            font-style: italic;
        }}
        .money-line {{
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="store-name">{store_name}</div>
        <div>{store_address}</div>
        <div class="separator"></div>
        <div class="receipt-title">SALES RECEIPT</div>
        <div class="separator"></div>
    </div>
    
    <div class="receipt-info">
        <div>Receipt: {receipt_id}</div>
        <div>Date: {formatted_date}</div>
    </div>
    
    <div class="separator"></div>
    
    <div class="items">
        <div style="font-weight: bold;">ITEMS PURCHASED:</div>
        <div class="separator" style="border-top: 1px dashed #000;"></div>
"""
        
        # Add items
        for item in items:
            name = str(item.get('name', 'Unknown Item'))
            quantity = int(item.get('quantity', 1))
            price = float(item.get('price', 0))
            line_total = quantity * price
            
            html_content += f"""
        <div class="item">
            <div class="item-name">{name}</div>
            <div class="money-line">
                <span>{quantity} x ₱{price:.2f}</span>
                <span>₱{line_total:.2f}</span>
            </div>
        </div>
"""
        
        html_content += f"""
    </div>
    
    <div class="separator"></div>
    
    <div class="summary">
        <div class="money-line">
            <span>Subtotal:</span>
            <span>₱{total:.2f}</span>
        </div>
        <div class="money-line total">
            <span>TOTAL:</span>
            <span>₱{total:.2f}</span>
        </div>
        <div class="separator"></div>
        <div class="money-line">
            <span>Cash Paid:</span>
            <span>₱{customer_money:.2f}</span>
        </div>
        <div class="money-line">
            <span>Change:</span>
            <span>₱{change:.2f}</span>
        </div>
    </div>
    
    <div class="footer">
        <div class="separator"></div>
        <div>Thank you for your purchase!</div>
        <div>Please come again.</div>
        <br>
        <div style="font-size: 10px;">Receipt ID: {receipt_id[-8:]}</div>
    </div>
</body>
</html>
"""
        return html_content
    
    def print_receipt_with_dialog(self, receipt_data: Dict[str, Any]) -> bool:
        """Print receipt using Windows print dialog"""
        try:
            # Create HTML receipt
            html_content = self.create_receipt_html(receipt_data)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(html_content)
                temp_file_path = temp_file.name
            
            # Use PowerShell to open browser and print
            cmd = [
                'powershell', '-Command',
                f'Start-Process -FilePath "msedge" -ArgumentList "{temp_file_path}" -WindowStyle Normal; Start-Sleep 2; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^p")'
            ]
            
            try:
                subprocess.run(cmd, check=True, capture_output=True, timeout=10)
            except:
                # Fallback: try with default browser
                cmd_fallback = [
                    'cmd', '/c', 'start', temp_file_path
                ]
                subprocess.run(cmd_fallback, check=True)
            
            print(f"Print dialog opened for receipt: {receipt_data.get('id', 'N/A')}", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Print error: {e}", file=sys.stderr)
            return False
    
    def print_receipt_direct(self, receipt_data: Dict[str, Any], printer_name: str = None) -> bool:
        """Print receipt directly to specified printer"""
        try:
            # Create HTML receipt
            html_content = self.create_receipt_html(receipt_data)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(html_content)
                temp_file_path = temp_file.name
            
            if printer_name:
                # Print to specific printer using command line
                cmd = [
                    'powershell', '-Command',
                    f'Start-Process -FilePath "{temp_file_path}" -Verb Print -WindowStyle Hidden'
                ]
                subprocess.run(cmd, check=True, capture_output=True)
            else:
                # Use default printer
                os.startfile(temp_file_path, 'print')
            
            print(f"Receipt sent to printer: {receipt_data.get('id', 'N/A')}", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Print error: {e}", file=sys.stderr)
            return False
    
    def test_print(self, printer_name: str = None) -> bool:
        """Print a test receipt"""
        test_receipt = {
            'storeName': 'Ken-dal Store POS',
            'storeAddress': '123 Main Street, City',
            'id': f'TEST-{datetime.now().strftime("%Y%m%d-%H%M%S")}',
            'date': datetime.now().isoformat(),
            'items': [
                {'name': 'Test Product 1', 'quantity': 2, 'price': 15.50},
                {'name': 'Test Product 2', 'quantity': 1, 'price': 25.00},
                {'name': 'Sample Long Product Name', 'quantity': 1, 'price': 12.75}
            ],
            'total': 68.75,
            'customerMoney': 70.00,
            'change': 1.25
        }
        
        print("Printing test receipt directly to printer...", file=sys.stderr)
        return self.print_receipt_direct(test_receipt, printer_name)

def main():
    """Main function for command line interface"""
    parser = argparse.ArgumentParser(description='Windows Printer for Ken-dal Store POS')
    parser.add_argument('command', choices=['list', 'test', 'print', 'print-dialog'], 
                       help='Command to execute')
    parser.add_argument('--data', type=str, help='JSON receipt data for printing')
    parser.add_argument('--printer', type=str, help='Specific printer name to use')
    
    args = parser.parse_args()
    
    windows_printer = WindowsPrinter()
    
    try:
        if args.command == 'list':
            # List available printers
            printers = windows_printer.find_printers()
            print(json.dumps(printers, indent=2))
            
        elif args.command == 'test':
            # Print test receipt
            success = windows_printer.test_print(args.printer)
            sys.exit(0 if success else 1)
                
        elif args.command == 'print':
            # Print receipt from data directly
            if not args.data:
                print("Error: --data parameter required for print command", file=sys.stderr)
                sys.exit(1)
            
            try:
                receipt_data = json.loads(args.data)
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON data: {e}", file=sys.stderr)
                sys.exit(1)
            
            success = windows_printer.print_receipt_direct(receipt_data, args.printer)
            sys.exit(0 if success else 1)
            
        elif args.command == 'print-dialog':
            # Print receipt with dialog
            if not args.data:
                print("Error: --data parameter required for print-dialog command", file=sys.stderr)
                sys.exit(1)
            
            try:
                receipt_data = json.loads(args.data)
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON data: {e}", file=sys.stderr)
                sys.exit(1)
            
            success = windows_printer.print_receipt_with_dialog(receipt_data)
            sys.exit(0 if success else 1)
                
    except KeyboardInterrupt:
        print("\nOperation cancelled by user", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 