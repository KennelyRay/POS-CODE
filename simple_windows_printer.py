#!/usr/bin/env python3
"""
Simple Windows Printer for Ken-dal Store POS System  
Direct printing to XP-58 via Windows printing system or USB
"""

import sys
import json
import argparse
import tempfile
import os
import subprocess
from datetime import datetime
from typing import Dict, List, Any

try:
    import win32print
    import win32api
    WIN32_AVAILABLE = True
except ImportError:
    print("Installing required Windows packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pywin32"])
    import win32print
    import win32api
    WIN32_AVAILABLE = True

# Try to import USB/ESC-POS for direct USB communication
try:
    from escpos.printer import Usb
    USB_AVAILABLE = True
except ImportError:
    USB_AVAILABLE = False

class SimpleWindowsPrinter:
    """Simple Windows printer for direct printing"""
    
    def find_printers(self) -> List[Dict[str, Any]]:
        """Get all installed Windows printers and USB thermal printers"""
        printers = []
        
        # Get Windows printers
        if WIN32_AVAILABLE:
            try:
                # Get default printer
                try:
                    default_printer = win32print.GetDefaultPrinter()
                except:
                    default_printer = None
                
                # Enumerate all printers
                printer_enum = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)
                
                for printer in printer_enum:
                    printer_name = printer[2]  # Printer name
                    is_default = printer_name == default_printer
                    
                    printer_data = {
                        'type': 'windows',
                        'name': printer_name,
                        'isDefault': is_default,
                        'status': 'Ready'
                    }
                    printers.append(printer_data)
                        
            except Exception as e:
                print(f"Error enumerating Windows printers: {e}", file=sys.stderr)
        
        # Try to detect USB thermal printers (XP-58 with libusb32)
        if USB_AVAILABLE:
            try:
                # Try XP-58 USB IDs
                test_printer = Usb(0x0483, 0x070B)
                printers.append({
                    'type': 'usb_thermal',
                    'name': 'XP-58 Thermal (USB)',
                    'isDefault': True,
                    'status': 'Ready',
                    'vendor_id': '0x0483',
                    'product_id': '0x070B'
                })
                test_printer.close()
            except Exception as e:
                print(f"USB thermal printer not detected: {e}", file=sys.stderr)
                
        return printers
    
    def create_simple_receipt_text(self, receipt_data: Dict[str, Any]) -> str:
        """Create simple text receipt for printing"""
        store_name = receipt_data.get('storeName', 'Ken-dal Store')
        store_address = receipt_data.get('storeAddress', '#6024 Purok 6 Jeepney Turning Point Kias Baguio City')
        receipt_id = receipt_data.get('id', 'N/A')
        date = receipt_data.get('date', datetime.now().isoformat())
        items = receipt_data.get('items', [])
        total = float(receipt_data.get('total', 0))
        customer_money = float(receipt_data.get('customerMoney', total))
        change = float(receipt_data.get('change', 0))
        
        # Parse date
        try:
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            formatted_date = parsed_date.strftime('%Y-%m-%d %H:%M')
        except:
            formatted_date = str(date)
        
        # Create receipt text
        lines = []

        lines.append(f"{store_name:^32}")
        lines.append(f"{store_address:^32}")
        lines.append("-" * 32)
        lines.append(f"{'SALES RECEIPT':^32}")
        lines.append("-" * 32)
        lines.append("")
        lines.append(f"Receipt: {receipt_id}")
        lines.append(f"Date: {formatted_date}")
        lines.append("")
        lines.append("ITEMS:")
        lines.append("." * 32)
        
        for item in items:
            name = str(item.get('name', 'Unknown Item'))
            quantity = int(item.get('quantity', 1))
            price = float(item.get('price', 0))
            line_total = quantity * price
            
            # Truncate long names
            if len(name) > 20:
                name = name[:17] + "..."
            
            lines.append(f"{name}")
            lines.append(f"  {quantity} x P{price:.2f} = P{line_total:.2f}")
            lines.append("")
        
        lines.append("." * 32)
        lines.append(f"SUBTOTAL: P{total:.2f}")
        lines.append("")
        lines.append(f"TOTAL: P{total:.2f}")
        lines.append("")
        lines.append(f"Cash: P{customer_money:.2f}")
        lines.append(f"Change: P{change:.2f}")
        lines.append("")
        lines.append("-" * 32)
        lines.append(f"{'Thank you!':^32}")
        lines.append(f"{'Please come again':^32}")
        lines.append(f"{'Note: This is not an official receipt':^32}")
        lines.append("")
        lines.append("-" * 32)
        lines.append("")  # Extra line for paper cutting
        return "\n".join(lines)
    
    def print_text_to_printer(self, text: str, printer_name: str = None) -> bool:
        """Print text directly to Windows printer or USB thermal printer"""
        try:
            # Check if this is XP-58 and USB is available
            if USB_AVAILABLE and (not printer_name or 'XP-58' in printer_name):
                try:
                    return self._print_usb_thermal(text)
                except Exception as e:
                    print(f"USB thermal printing failed: {e}", file=sys.stderr)
                    print("Falling back to Windows printing...", file=sys.stderr)
            
            # Get Windows printer name
            if not printer_name:
                try:
                    printer_name = win32print.GetDefaultPrinter()
                except:
                    printers = self.find_printers()
                    windows_printers = [p for p in printers if p['type'] == 'windows']
                    if windows_printers:
                        printer_name = windows_printers[0]['name']
                    else:
                        print("No Windows printers found", file=sys.stderr)
                        return False
            
            # Try RAW printing first (for direct USB printer port)
            try:
                return self._print_raw(text, printer_name)
            except Exception as e:
                print(f"RAW printing failed: {e}", file=sys.stderr)
                print("Trying alternative printing method...", file=sys.stderr)
                return self._print_with_notepad(text, printer_name)
                
        except Exception as e:
            print(f"Print error: {e}", file=sys.stderr)
            return False
    
    def _print_raw(self, text: str, printer_name: str) -> bool:
        """Print using RAW mode (for USB printer port)"""
        # Open printer
        printer_handle = win32print.OpenPrinter(printer_name)
        
        try:
            # Start document
            doc_info = ("Receipt", None, "RAW")
            job_id = win32print.StartDocPrinter(printer_handle, 1, doc_info)
            
            try:
                # Start page
                win32print.StartPagePrinter(printer_handle)
                
                # Send text data
                win32print.WritePrinter(printer_handle, text.encode('utf-8'))
                
                # End page
                win32print.EndPagePrinter(printer_handle)
                
                print(f"Successfully printed to {printer_name} using RAW mode", file=sys.stderr)
                return True
                
            finally:
                # End document
                win32print.EndDocPrinter(printer_handle)
                
        finally:
            # Close printer
            win32print.ClosePrinter(printer_handle)
    
    def _print_with_notepad(self, text: str, printer_name: str) -> bool:
        """Alternative printing using temporary file and system print"""
        import tempfile
        import subprocess
        
        try:
            # Create temporary text file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(text)
                temp_file_path = temp_file.name
            
            # Print using Windows print command
            cmd = f'print /D:"{printer_name}" "{temp_file_path}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            # Clean up
            try:
                os.unlink(temp_file_path)
            except:
                pass
            
            if result.returncode == 0:
                print(f"Successfully printed to {printer_name} using system print", file=sys.stderr)
                return True
            else:
                print(f"System print failed: {result.stderr}", file=sys.stderr)
                return False
                
        except Exception as e:
            print(f"Alternative print method failed: {e}", file=sys.stderr)
            return False
    
    def _print_usb_thermal(self, text: str) -> bool:
        """Print using direct USB thermal printer (libusb32)"""
        try:
            # Connect to XP-58
            printer = Usb(0x0483, 0x070B)
            
            # Initialize printer
            printer._raw(b'\x1B\x40')  # ESC @ - Initialize printer
            
            # Send text
            printer.text(text)
            
            # Cut paper
            try:
                printer.cut()
            except:
                printer.text("\n\n\n")  # Feed paper if cut not supported
            
            printer.close()
            print("Successfully printed to XP-58 using USB thermal", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"USB thermal print error: {e}", file=sys.stderr)
            raise e
    
    def print_receipt(self, receipt_data: Dict[str, Any], printer_name: str = None) -> bool:
        """Print receipt to Windows printer"""
        text = self.create_simple_receipt_text(receipt_data)
        return self.print_text_to_printer(text, printer_name)
    
    def test_print(self, printer_name: str = None) -> bool:
        """Print a test receipt"""
        test_receipt = {
            'storeName': 'Ken-dal Store POS',
            'storeAddress': '123 Main Street, City',
            'id': f'TEST-{datetime.now().strftime("%Y%m%d-%H%M%S")}',
            'date': datetime.now().isoformat(),
            'items': [
                {'name': 'Test Product 1', 'quantity': 2, 'price': 15.50},
                {'name': 'Test Product 2', 'quantity': 1, 'price': 25.00}
            ],
            'total': 56.00,
            'customerMoney': 60.00,
            'change': 4.00
        }
        
        print(f"Printing test receipt to {printer_name or 'default printer'}...", file=sys.stderr)
        return self.print_receipt(test_receipt, printer_name)

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Simple Windows Printer for Ken-dal Store POS')
    parser.add_argument('command', choices=['list', 'test', 'print'], 
                       help='Command to execute')
    parser.add_argument('--data', type=str, help='JSON receipt data for printing')
    parser.add_argument('--printer', type=str, help='Specific printer name to use')
    
    args = parser.parse_args()
    
    printer = SimpleWindowsPrinter()
    
    try:
        if args.command == 'list':
            printers = printer.find_printers()
            print(json.dumps(printers, indent=2))
            
        elif args.command == 'test':
            success = printer.test_print(args.printer)
            sys.exit(0 if success else 1)
                
        elif args.command == 'print':
            if not args.data:
                print("Error: --data parameter required", file=sys.stderr)
                sys.exit(1)
            
            try:
                receipt_data = json.loads(args.data)
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON: {e}", file=sys.stderr)
                sys.exit(1)
            
            success = printer.print_receipt(receipt_data, args.printer)
            sys.exit(0 if success else 1)
                
    except KeyboardInterrupt:
        print("\nCancelled", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 