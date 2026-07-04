#!/usr/bin/env python3
"""
Advanced Thermal Receipt Printer for Ken-dal Store POS System
Supports ESC/POS thermal printers with enhanced print quality and darkness control
"""

import sys
import json
import argparse
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional

try:
    from escpos.printer import Usb, Serial, Network
    from serial.serialutil import SerialException  # Import from pyserial instead
    from escpos.exceptions import USBNotFoundError
    import usb.core
    import usb.util
    from PIL import Image, ImageDraw, ImageFont
    import qrcode
except ImportError as e:
    print(f"Error: Required Python packages not installed. Please run: pip install -r requirements.txt")
    print(f"Missing package: {e}")
    sys.exit(1)

class ThermalPrinter:
    """Advanced thermal printer manager with enhanced ESC/POS control"""
    
    def __init__(self):
        self.printer = None
        self.printer_type = None
        self.connection_params = {}
        
    def find_thermal_printers(self) -> List[Dict[str, Any]]:
        """Discover available thermal printers"""
        printers = []
        
        # Common thermal printer vendor IDs
        thermal_vendors = [
            {'vendor_id': 0x04b8, 'name': 'Epson'},  # Epson TM series
            {'vendor_id': 0x0fe6, 'name': 'ICS Advent'},  # Generic ESC/POS
            {'vendor_id': 0x0416, 'name': 'Winbond'},  # Some generic printers
            {'vendor_id': 0x0519, 'name': 'Star Micronics'},
            {'vendor_id': 0x1504, 'name': 'XP-58'},  # XP-58 and similar
        ]
        
        # Find USB thermal printers
        devices = usb.core.find(find_all=True)
        for device in devices:
            for vendor in thermal_vendors:
                if device.idVendor == vendor['vendor_id']:
                    try:
                        manufacturer = usb.util.get_string(device, device.iManufacturer) if device.iManufacturer else vendor['name']
                        product = usb.util.get_string(device, device.iProduct) if device.iProduct else f"Thermal Printer"
                        
                        printer_info = {
                            'type': 'usb',
                            'vendor_id': hex(device.idVendor),
                            'product_id': hex(device.idProduct),
                            'manufacturer': manufacturer,
                            'product': product,
                            'name': f"{manufacturer} {product}",
                            'connection': f"USB VID:{device.idVendor:04X} PID:{device.idProduct:04X}",
                            'isDefault': False
                        }
                        printers.append(printer_info)
                    except (ValueError, UnicodeDecodeError):
                        # Fallback for devices that can't provide string descriptors
                        printer_info = {
                            'type': 'usb',
                            'vendor_id': hex(device.idVendor),
                            'product_id': hex(device.idProduct),
                            'manufacturer': vendor['name'],
                            'product': 'Thermal Printer',
                            'name': f"{vendor['name']} Thermal Printer",
                            'connection': f"USB VID:{device.idVendor:04X} PID:{device.idProduct:04X}",
                            'isDefault': False
                        }
                        printers.append(printer_info)
        
        # Add common serial ports for thermal printers
        common_ports = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', '/dev/ttyUSB0', '/dev/ttyUSB1']
        for port in common_ports:
            printers.append({
                'type': 'serial',
                'name': f'Serial Thermal Printer ({port})',
                'connection': port,
                'manufacturer': 'Generic',
                'product': 'Serial Thermal Printer',
                'isDefault': False
            })
        
        # Mark first USB printer as default if any found
        usb_printers = [p for p in printers if p['type'] == 'usb']
        if usb_printers:
            usb_printers[0]['isDefault'] = True
        elif printers:
            printers[0]['isDefault'] = True
            
        return printers
    
    def connect_printer(self, printer_name: str = None) -> bool:
        """Connect to thermal printer"""
        try:
            printers = self.find_thermal_printers()
            
            if not printers:
                print("No thermal printers found")
                return False
            
            # Find specific printer or use default
            target_printer = None
            if printer_name:
                target_printer = next((p for p in printers if p['name'] == printer_name), None)
            else:
                target_printer = next((p for p in printers if p['isDefault']), printers[0])
            
            if not target_printer:
                print(f"Printer '{printer_name}' not found")
                return False
            
            # Connect based on printer type
            if target_printer['type'] == 'usb':
                vendor_id = int(target_printer['vendor_id'], 16)
                product_id = int(target_printer['product_id'], 16)
                self.printer = Usb(vendor_id, product_id)
                self.printer_type = 'usb'
                self.connection_params = {'vendor_id': vendor_id, 'product_id': product_id}
                
            elif target_printer['type'] == 'serial':
                port = target_printer['connection']
                self.printer = Serial(port, baudrate=9600, timeout=1)
                self.printer_type = 'serial'
                self.connection_params = {'port': port}
            
            # Test connection with enhanced thermal settings
            self._initialize_thermal_settings()
            print(f"Connected to: {target_printer['name']}")
            return True
            
        except (USBNotFoundError, SerialException) as e:
            print(f"Connection error: {e}")
            return False
        except Exception as e:
            print(f"Unexpected error connecting to printer: {e}")
            return False
    
    def _initialize_thermal_settings(self):
        """Initialize printer with enhanced thermal settings for maximum darkness"""
        if not self.printer:
            return
            
        try:
            # ESC/POS commands for maximum print quality
            self.printer._raw(b'\x1B\x40')  # Initialize printer
            self.printer._raw(b'\x1B\x21\x08')  # Emphasized mode ON
            self.printer._raw(b'\x1D\x28\x4B\x02\x00\x30\x32')  # Set print density to maximum
            self.printer._raw(b'\x1B\x7B\x01')  # Upside down printing OFF
            
            # Set maximum heat settings for thermal head
            self.printer._raw(b'\x1B\x37\x07\x64\x64')  # Set print parameters (max heat, max time)
            
        except Exception as e:
            print(f"Warning: Could not set enhanced thermal settings: {e}")
    
    def _apply_enhanced_formatting(self):
        """Apply enhanced formatting for better print quality"""
        if not self.printer:
            return
            
        try:
            # Double-width + Double-height for headers
            self.printer._raw(b'\x1D\x21\x11')  # Double width + height
            self.printer._raw(b'\x1B\x45\x01')  # Bold ON
            self.printer._raw(b'\x1B\x47\x01')  # Double-strike ON
        except:
            pass
    
    def _reset_formatting(self):
        """Reset formatting to normal"""
        if not self.printer:
            return
            
        try:
            self.printer._raw(b'\x1B\x21\x00')  # Normal text
            self.printer._raw(b'\x1B\x45\x00')  # Bold OFF
            self.printer._raw(b'\x1B\x47\x00')  # Double-strike OFF
        except:
            pass
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> bool:
        """Print receipt with enhanced thermal quality"""
        if not self.printer:
            print("Error: No printer connected")
            return False
        
        try:
            # Parse receipt data
            store_name = receipt_data.get('storeName', 'Ken-dal Store')
            store_address = receipt_data.get('storeAddress', '123 Main Street')
            receipt_id = receipt_data.get('id', 'N/A')
            date = receipt_data.get('date', datetime.now().isoformat())
            items = receipt_data.get('items', [])
            total = float(receipt_data.get('total', 0))
            customer_money = float(receipt_data.get('customerMoney', total))
            change = float(receipt_data.get('change', 0))
            
            # Initialize with enhanced settings
            self._initialize_thermal_settings()
            
            # Header section with enhanced formatting
            self._apply_enhanced_formatting()
            self.printer.set(align='center', text_type='B', width=2, height=2)
            self.printer.text(f"{store_name}\n")
            self._reset_formatting()
            
            self.printer.set(align='center')
            self.printer.text(f"{store_address}\n")
            self.printer.text("=" * 32 + "\n")
            self.printer.set(text_type='B')
            self.printer.text("SALES RECEIPT\n")
            self.printer.text("=" * 32 + "\n\n")
            
            # Receipt info
            self.printer.set(align='left', text_type='normal')
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            self.printer.text(f"Receipt: {receipt_id}\n")
            self.printer.text(f"Date: {parsed_date.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Items section
            self.printer.set(text_type='B')
            self.printer.text("ITEMS PURCHASED:\n")
            self.printer.text("-" * 32 + "\n")
            self.printer.set(text_type='normal')
            
            # Print each item
            for item in items:
                name = str(item.get('name', 'Unknown Item'))
                quantity = int(item.get('quantity', 1))
                price = float(item.get('price', 0))
                line_total = quantity * price
                
                # Item name (truncate if too long)
                if len(name) > 30:
                    name = name[:27] + "..."
                self.printer.text(f"{name}\n")
                
                # Quantity, price, and total
                qty_price = f"  {quantity} x ₱{price:.2f}"
                total_str = f"₱{line_total:.2f}"
                
                # Right-align the total
                spaces_needed = 32 - len(qty_price) - len(total_str)
                if spaces_needed > 0:
                    self.printer.text(qty_price + " " * spaces_needed + total_str + "\n")
                else:
                    self.printer.text(qty_price + "\n")
                    self.printer.text(" " * (32 - len(total_str)) + total_str + "\n")
                
                self.printer.text("\n")
            
            # Summary section
            self.printer.text("=" * 32 + "\n")
            self.printer.set(text_type='B')
            self.printer.text("PAYMENT SUMMARY:\n")
            self.printer.set(text_type='normal')
            
            # Financial summary with enhanced formatting
            subtotal_line = "Subtotal:"
            subtotal_amount = f"₱{total:.2f}"
            spaces = 32 - len(subtotal_line) - len(subtotal_amount)
            self.printer.text(subtotal_line + " " * max(1, spaces) + subtotal_amount + "\n")
            
            # Apply bold for total
            self.printer.set(text_type='B', height=2)
            total_line = "TOTAL:"
            total_amount = f"₱{total:.2f}"
            spaces = 32 - len(total_line) - len(total_amount)
            self.printer.text(total_line + " " * max(1, spaces) + total_amount + "\n")
            self.printer.set(text_type='normal', height=1)
            
            self.printer.text("\n")
            
            # Payment information
            cash_line = "Cash Paid:"
            cash_amount = f"₱{customer_money:.2f}"
            spaces = 32 - len(cash_line) - len(cash_amount)
            self.printer.text(cash_line + " " * max(1, spaces) + cash_amount + "\n")
            
            change_line = "Change:"
            change_amount = f"₱{change:.2f}"
            spaces = 32 - len(change_line) - len(change_amount)
            self.printer.text(change_line + " " * max(1, spaces) + change_amount + "\n")
            
            # Footer
            self.printer.text("\n" + "=" * 32 + "\n\n")
            self.printer.set(align='center')
            self.printer.text("Thank you for your purchase!\n")
            self.printer.text("Please come again.\n\n")
            
            # QR Code for digital receipt (optional)
            try:
                qr_data = f"Receipt:{receipt_id}|Total:₱{total:.2f}|Date:{parsed_date.strftime('%Y-%m-%d')}"
                qr = qrcode.QRCode(version=1, box_size=3, border=1)
                qr.add_data(qr_data)
                qr.make(fit=True)
                
                # Convert QR to image and print
                qr_img = qr.make_image(fill_color="black", back_color="white")
                qr_img = qr_img.resize((128, 128))  # Resize for thermal printer
                self.printer.image(qr_img, center=True)
                self.printer.text("\nScan for digital receipt\n")
            except:
                pass  # QR code printing is optional
            
            # Final spacing and cut
            self.printer.text("\n\n\n")
            
            # Cut paper if supported
            try:
                self.printer.cut()
            except:
                self.printer.text("\n" + "-" * 32 + "\n")  # Fallback separator
            
            print(f"Receipt printed successfully: {receipt_id}")
            return True
            
        except Exception as e:
            print(f"Print error: {e}")
            traceback.print_exc()
            return False
    
    def test_print(self) -> bool:
        """Print a test receipt to verify printer functionality"""
        test_receipt = {
            'storeName': 'Ken-dal Store POS',
            'storeAddress': '123 Main Street, City',
            'id': f'TEST-{datetime.now().strftime("%Y%m%d-%H%M%S")}',
            'date': datetime.now().isoformat(),
            'items': [
                {'name': 'Test Product 1', 'quantity': 2, 'price': 15.50},
                {'name': 'Test Product 2', 'quantity': 1, 'price': 25.00},
                {'name': 'Very Long Product Name Test Item', 'quantity': 3, 'price': 8.75}
            ],
            'total': 82.25,
            'customerMoney': 100.00,
            'change': 17.75
        }
        
        print("Printing test receipt...")
        return self.print_receipt(test_receipt)
    
    def open_cash_drawer(self) -> bool:
        """Open cash drawer connected to thermal printer"""
        if not self.printer:
            print("Error: No printer connected")
            return False
        
        try:
            # ESC/POS command to open cash drawer
            self.printer._raw(b'\x1B\x70\x00\x19\xFA')  # Open drawer pulse
            print("Cash drawer opened")
            return True
        except Exception as e:
            print(f"Error opening cash drawer: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from printer"""
        if self.printer:
            try:
                self.printer.close()
            except:
                pass
            self.printer = None
            self.printer_type = None
            self.connection_params = {}

def main():
    """Main function for command line interface"""
    parser = argparse.ArgumentParser(description='Thermal Receipt Printer for Ken-dal Store POS')
    parser.add_argument('command', choices=['list', 'test', 'print', 'drawer'], 
                       help='Command to execute')
    parser.add_argument('--data', type=str, help='JSON receipt data for printing')
    parser.add_argument('--printer', type=str, help='Specific printer name to use')
    parser.add_argument('--text', type=str, help='Direct text to print (for testing)')
    
    args = parser.parse_args()
    
    thermal_printer = ThermalPrinter()
    
    try:
        if args.command == 'list':
            # List available printers
            printers = thermal_printer.find_thermal_printers()
            print(json.dumps(printers, indent=2))
            
        elif args.command == 'test':
            # Print test receipt
            if thermal_printer.connect_printer(args.printer):
                success = thermal_printer.test_print()
                thermal_printer.disconnect()
                sys.exit(0 if success else 1)
            else:
                print("Failed to connect to printer")
                sys.exit(1)
                
        elif args.command == 'print':
            # Print receipt from data
            if not args.data:
                print("Error: --data parameter required for print command")
                sys.exit(1)
            
            try:
                receipt_data = json.loads(args.data)
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON data: {e}")
                sys.exit(1)
            
            if thermal_printer.connect_printer(args.printer):
                success = thermal_printer.print_receipt(receipt_data)
                thermal_printer.disconnect()
                sys.exit(0 if success else 1)
            else:
                print("Failed to connect to printer")
                sys.exit(1)
                
        elif args.command == 'drawer':
            # Open cash drawer
            if thermal_printer.connect_printer(args.printer):
                success = thermal_printer.open_cash_drawer()
                thermal_printer.disconnect()
                sys.exit(0 if success else 1)
            else:
                print("Failed to connect to printer")
                sys.exit(1)
                
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        thermal_printer.disconnect()
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        thermal_printer.disconnect()
        sys.exit(1)

if __name__ == "__main__":
    main() 