#!/usr/bin/env python3
"""
Basic Thermal Receipt Printer for Ken-dal Store POS System
Works with Windows USB backend issues - Python 3.13 compatible
"""

import sys
import json
import argparse
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional

def check_usb_backend():
    """Check if USB backend is available"""
    try:
        import usb.core
        import usb.backend.libusb1
        import usb.backend.windows
        
        # Try to get a backend
        backend = None
        backends = [
            usb.backend.libusb1.get_backend(),
            usb.backend.windows.get_backend()
        ]
        
        for b in backends:
            if b is not None:
                backend = b
                break
        
        if backend is None:
            print("Warning: No USB backend available. USB printers may not work.", file=sys.stderr)
            return False
        else:
            print(f"USB backend available: {backend}", file=sys.stderr)
            return True
            
    except ImportError as e:
        print(f"USB support not available: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"USB backend check failed: {e}", file=sys.stderr)
        return False

try:
    from escpos.printer import Usb, Serial, Network
    try:
        from serial.serialutil import SerialException
    except ImportError:
        from escpos.exceptions import SerialException
    
    try:
        from escpos.exceptions import USBNotFoundError
    except ImportError:
        class USBNotFoundError(Exception):
            pass
    
    # Check USB backend availability
    usb_available = check_usb_backend()
    
    if usb_available:
        import usb.core
        import usb.util
    else:
        print("USB functionality disabled - only serial printers will be detected", file=sys.stderr)
        usb = None
        
except ImportError as e:
    print(f"Error: Required Python packages not installed.", file=sys.stderr)
    print(f"Please run: pip install python-escpos pyserial", file=sys.stderr)
    print(f"Missing package: {e}", file=sys.stderr)
    sys.exit(1)

class BasicThermalPrinter:
    """Basic thermal printer manager with fallback support"""
    
    def __init__(self):
        self.printer = None
        self.printer_type = None
        self.connection_params = {}
        
    def find_thermal_printers(self) -> List[Dict[str, Any]]:
        """Discover available thermal printers with fallback support"""
        printers = []
        
        # Try USB detection if available
        if usb and usb_available:
            try:
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
                            except Exception:
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
            except Exception as e:
                print(f"USB detection failed: {e}", file=sys.stderr)
        
        # Always add serial ports for thermal printers
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
        
        # Mark first USB printer as default if any found, otherwise first serial
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
                print("No thermal printers found", file=sys.stderr)
                return False
            
            # Find specific printer or use default
            target_printer = None
            if printer_name:
                target_printer = next((p for p in printers if p['name'] == printer_name), None)
            else:
                target_printer = next((p for p in printers if p['isDefault']), printers[0])
            
            if not target_printer:
                print(f"Printer '{printer_name}' not found", file=sys.stderr)
                return False
            
            # Connect based on printer type
            if target_printer['type'] == 'usb':
                if not usb_available:
                    print("USB backend not available - cannot connect to USB printer", file=sys.stderr)
                    return False
                    
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
            
            # Test connection
            self._initialize_thermal_settings()
            print(f"Connected to: {target_printer['name']}", file=sys.stderr)
            return True
            
        except (USBNotFoundError, SerialException) as e:
            print(f"Connection error: {e}", file=sys.stderr)
            return False
        except Exception as e:
            print(f"Unexpected error connecting to printer: {e}", file=sys.stderr)
            return False
    
    def _initialize_thermal_settings(self):
        """Initialize printer with enhanced thermal settings"""
        if not self.printer:
            return
            
        try:
            # ESC/POS commands for maximum print quality
            self.printer._raw(b'\x1B\x40')  # Initialize printer
            self.printer._raw(b'\x1B\x21\x08')  # Emphasized mode ON
        except Exception as e:
            print(f"Warning: Could not set thermal settings: {e}", file=sys.stderr)
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> bool:
        """Print receipt"""
        if not self.printer:
            print("Error: No printer connected", file=sys.stderr)
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
            
            # Header
            self.printer.set(align='center', text_type='B')
            self.printer.text(f"{store_name}\n")
            self.printer.text(f"{store_address}\n")
            self.printer.text("=" * 32 + "\n")
            self.printer.text("SALES RECEIPT\n")
            self.printer.text("=" * 32 + "\n\n")
            
            # Receipt info
            self.printer.set(align='left', text_type='normal')
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            self.printer.text(f"Receipt: {receipt_id}\n")
            self.printer.text(f"Date: {parsed_date.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Items
            self.printer.text("ITEMS:\n")
            self.printer.text("-" * 32 + "\n")
            
            for item in items:
                name = str(item.get('name', 'Unknown Item'))
                quantity = int(item.get('quantity', 1))
                price = float(item.get('price', 0))
                line_total = quantity * price
                
                if len(name) > 20:
                    name = name[:17] + "..."
                    
                self.printer.text(f"{name}\n")
                self.printer.text(f"  {quantity} x P{price:.2f} = P{line_total:.2f}\n\n")
            
            # Summary
            self.printer.text("=" * 32 + "\n")
            self.printer.set(text_type='B')
            self.printer.text(f"TOTAL: P{total:.2f}\n")
            self.printer.set(text_type='normal')
            self.printer.text(f"Cash: P{customer_money:.2f}\n")
            self.printer.text(f"Change: P{change:.2f}\n\n")
            
            # Footer
            self.printer.set(align='center')
            self.printer.text("Thank you!\n")
            self.printer.text("Please come again.\n\n\n")
            
            try:
                self.printer.cut()
            except:
                self.printer.text("\n" + "-" * 32 + "\n")
            
            print(f"Receipt printed: {receipt_id}", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Print error: {e}", file=sys.stderr)
            return False
    
    def test_print(self) -> bool:
        """Print a test receipt"""
        test_receipt = {
            'storeName': 'Ken-dal Store POS',
            'storeAddress': '123 Main Street, City',
            'id': f'TEST-{datetime.now().strftime("%Y%m%d-%H%M%S")}',
            'date': datetime.now().isoformat(),
            'items': [
                {'name': 'Test Item 1', 'quantity': 2, 'price': 15.50},
                {'name': 'Test Item 2', 'quantity': 1, 'price': 25.00}
            ],
            'total': 56.00,
            'customerMoney': 60.00,
            'change': 4.00
        }
        
        print("Printing test receipt...", file=sys.stderr)
        return self.print_receipt(test_receipt)
    
    def open_cash_drawer(self) -> bool:
        """Open cash drawer"""
        if not self.printer:
            print("Error: No printer connected", file=sys.stderr)
            return False
        
        try:
            self.printer._raw(b'\x1B\x70\x00\x19\xFA')
            print("Cash drawer opened", file=sys.stderr)
            return True
        except Exception as e:
            print(f"Error opening cash drawer: {e}", file=sys.stderr)
            return False
    
    def disconnect(self):
        """Disconnect from printer"""
        if self.printer:
            try:
                self.printer.close()
            except:
                pass
            self.printer = None

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Basic Thermal Printer for Ken-dal Store POS')
    parser.add_argument('command', choices=['list', 'test', 'print', 'drawer'], 
                       help='Command to execute')
    parser.add_argument('--data', type=str, help='JSON receipt data for printing')
    parser.add_argument('--printer', type=str, help='Specific printer name to use')
    
    args = parser.parse_args()
    
    thermal_printer = BasicThermalPrinter()
    
    try:
        if args.command == 'list':
            printers = thermal_printer.find_thermal_printers()
            print(json.dumps(printers, indent=2))
            
        elif args.command == 'test':
            if thermal_printer.connect_printer(args.printer):
                success = thermal_printer.test_print()
                thermal_printer.disconnect()
                sys.exit(0 if success else 1)
            else:
                print("Failed to connect to printer", file=sys.stderr)
                sys.exit(1)
                
        elif args.command == 'print':
            if not args.data:
                print("Error: --data parameter required", file=sys.stderr)
                sys.exit(1)
            
            try:
                receipt_data = json.loads(args.data)
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON: {e}", file=sys.stderr)
                sys.exit(1)
            
            if thermal_printer.connect_printer(args.printer):
                success = thermal_printer.print_receipt(receipt_data)
                thermal_printer.disconnect()
                sys.exit(0 if success else 1)
            else:
                print("Failed to connect to printer", file=sys.stderr)
                sys.exit(1)
                
        elif args.command == 'drawer':
            if thermal_printer.connect_printer(args.printer):
                success = thermal_printer.open_cash_drawer()
                thermal_printer.disconnect()
                sys.exit(0 if success else 1)
            else:
                print("Failed to connect to printer", file=sys.stderr)
                sys.exit(1)
                
    except KeyboardInterrupt:
        print("\nCancelled", file=sys.stderr)
        thermal_printer.disconnect()
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        thermal_printer.disconnect()
        sys.exit(1)

if __name__ == "__main__":
    main() 