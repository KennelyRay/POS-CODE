#!/usr/bin/env python3
"""
XP-58 Thermal Receipt Printer for Ken-dal Store POS System
Optimized for XP-58 USB thermal printers with enhanced detection
"""

import sys
import json
import argparse
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional

try:
    from escpos.printer import Usb, Serial
    from escpos.exceptions import USBNotFoundError
    import usb.core
    import usb.util
except ImportError as e:
    print(f"Error: Required Python packages not installed.")
    print(f"Please run: pip install python-escpos pyusb")
    print(f"Missing package: {e}")
    sys.exit(1)

class XP58ThermalPrinter:
    """XP-58 thermal printer manager with enhanced USB support"""
    
    def __init__(self):
        self.printer = None
        self.printer_type = None
        self.connection_params = {}
    
    def find_xp58_printers(self) -> List[Dict[str, Any]]:
        """Find XP-58 and compatible thermal printers"""
        printers = []
        
        # Common XP-58 and thermal printer USB IDs
        common_thermal_ids = [
            (0x0483, 0x0011),  # Your detected device
            (0x04b8, 0x0202),  # Epson TM series
            (0x04b8, 0x0203),  # Epson TM series
            (0x0fe6, 0x811e),  # ICS Advent
            (0x1a86, 0x7584),  # Generic thermal printer
            (0x1fc9, 0x2016),  # NXP thermal printer
            (0x28e9, 0x028a),  # GG Image thermal printer
        ]
        
        try:
            # Find USB thermal printers
            for vendor_id, product_id in common_thermal_ids:
                devices = usb.core.find(find_all=True, idVendor=vendor_id, idProduct=product_id)
                for device in devices:
                    try:
                        manufacturer = "Unknown"
                        product = "Unknown"
                        
                        try:
                            if device.iManufacturer:
                                manufacturer = usb.util.get_string(device, device.iManufacturer)
                            if device.iProduct:
                                product = usb.util.get_string(device, device.iProduct)
                        except:
                            pass
                        
                        printer_name = f"XP-58 Thermal Printer (USB)" if vendor_id == 0x0483 else f"{product} ({manufacturer})"
                        
                        printer_data = {
                            'type': 'usb',
                            'name': printer_name,
                            'vendor_id': f'0x{vendor_id:04x}',
                            'product_id': f'0x{product_id:04x}',
                            'manufacturer': manufacturer,
                            'product': product,
                            'isDefault': vendor_id == 0x0483,  # Your detected device as default
                            'connection': f'USB VID:{vendor_id:04x} PID:{product_id:04x}'
                        }
                        printers.append(printer_data)
                        
                    except Exception as e:
                        print(f"Warning: Could not get device info for {vendor_id:04x}:{product_id:04x}: {e}", file=sys.stderr)
                        
        except Exception as e:
            print(f"Warning: USB device enumeration failed: {e}", file=sys.stderr)
        
        # Add common serial ports as fallback
        serial_ports = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5']
        for port in serial_ports:
            printers.append({
                'type': 'serial',
                'name': f'Serial Thermal Printer ({port})',
                'connection': port,
                'manufacturer': 'Generic',
                'product': 'Serial Thermal Printer',
                'isDefault': False
            })
        
        return printers
    
    def connect_printer(self, printer_name: str = None) -> bool:
        """Connect to XP-58 thermal printer"""
        try:
            printers = self.find_xp58_printers()
            
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
                vendor_id = int(target_printer['vendor_id'], 16)
                product_id = int(target_printer['product_id'], 16)
                
                try:
                    # Connect to XP-58 (VID: 0x0483, PID: 0x070B)
                    self.printer = Usb(0x0483, 0x070B)
                    self.printer_type = 'usb'
                    self.connection_params = {'vendor_id': vendor_id, 'product_id': product_id}
                    print(f"Connected to USB printer: {target_printer['name']}", file=sys.stderr)
                except Exception as e:
                    print(f"USB connection failed: {e}", file=sys.stderr)
                    return False
                    
            elif target_printer['type'] == 'serial':
                port = target_printer['connection']
                try:
                    self.printer = Serial(port, baudrate=9600, timeout=1)
                    self.printer_type = 'serial'
                    self.connection_params = {'port': port}
                    print(f"Connected to serial printer: {target_printer['name']}", file=sys.stderr)
                except Exception as e:
                    print(f"Serial connection failed for {port}: {e}", file=sys.stderr)
                    return False
            
            # Test connection
            self._initialize_thermal_settings()
            return True
            
        except Exception as e:
            print(f"Connection error: {e}", file=sys.stderr)
            return False
    
    def _initialize_thermal_settings(self):
        """Initialize printer with enhanced thermal settings"""
        if not self.printer:
            return
            
        try:
            # Basic ESC/POS commands that are widely supported
            self.printer._raw(b'\x1B\x40')  # Initialize printer
            # Skip advanced thermal commands for compatibility
        except Exception as e:
            print(f"Warning: Could not set thermal settings: {e}", file=sys.stderr)
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> bool:
        """Print receipt with XP-58 optimized settings"""
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
            self.printer.set(align='center', bold=True)
            self.printer.text(f"{store_name}\n")
            self.printer.text(f"{store_address}\n")
            self.printer.text("=" * 32 + "\n")
            self.printer.text("SALES RECEIPT\n")
            self.printer.text("=" * 32 + "\n\n")
            
            # Receipt info
            self.printer.set(align='left', bold=False)
            try:
                parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
                formatted_date = parsed_date.strftime('%Y-%m-%d %H:%M:%S')
            except:
                formatted_date = str(date)
                
            self.printer.text(f"Receipt: {receipt_id}\n")
            self.printer.text(f"Date: {formatted_date}\n\n")
            
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
            self.printer.set(bold=True)
            self.printer.text(f"TOTAL: P{total:.2f}\n")
            self.printer.set(bold=False)
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
            traceback.print_exc()
            return False
    
    def test_print(self) -> bool:
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
        
        print("Printing test receipt...", file=sys.stderr)
        return self.print_receipt(test_receipt)
    
    def open_cash_drawer(self) -> bool:
        """Open cash drawer connected to thermal printer"""
        if not self.printer:
            print("Error: No printer connected", file=sys.stderr)
            return False
        
        try:
            # ESC/POS command to open cash drawer
            self.printer._raw(b'\x1B\x70\x00\x19\xFA')  # Open drawer pulse
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
            self.printer_type = None
            self.connection_params = {}

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='XP-58 Thermal Printer for Ken-dal Store POS')
    parser.add_argument('command', choices=['list', 'test', 'print', 'drawer'], 
                       help='Command to execute')
    parser.add_argument('--data', type=str, help='JSON receipt data for printing')
    parser.add_argument('--printer', type=str, help='Specific printer name to use')
    
    args = parser.parse_args()
    
    thermal_printer = XP58ThermalPrinter()
    
    try:
        if args.command == 'list':
            printers = thermal_printer.find_xp58_printers()
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
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 