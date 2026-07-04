#!/usr/bin/env python3
"""
XP-58 Direct USB Printer - Pure PyUSB Implementation
Works with libusb-win32 driver when python-escpos fails
"""

import sys
import json
import argparse
import usb.core
import usb.util
from datetime import datetime
from typing import Dict, List, Any

class XP58DirectUSB:
    """Direct USB communication with XP-58 using PyUSB only"""
    
    def __init__(self):
        self.device = None
        self.ep_out = None
        self.ep_in = None
    
    def connect(self) -> bool:
        """Connect to XP-58 via USB"""
        try:
            # Find XP-58 device
            self.device = usb.core.find(idVendor=0x0483, idProduct=0x070B)
            
            if self.device is None:
                print("Error: XP-58 not found (VID: 0x0483, PID: 0x070B)", file=sys.stderr)
                return False
            
            # Set configuration
            try:
                self.device.set_configuration()
            except Exception as e:
                print(f"Warning: Could not set configuration: {e}", file=sys.stderr)
            
            # Find endpoints
            cfg = self.device.get_active_configuration()
            intf = cfg[(0,0)]
            
            for ep in intf:
                if usb.util.endpoint_direction(ep.bEndpointAddress) == usb.util.ENDPOINT_OUT:
                    self.ep_out = ep
                elif usb.util.endpoint_direction(ep.bEndpointAddress) == usb.util.ENDPOINT_IN:
                    self.ep_in = ep
            
            if self.ep_out is None:
                print("Error: No OUT endpoint found", file=sys.stderr)
                return False
            
            print("Connected to XP-58 successfully", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Connection error: {e}", file=sys.stderr)
            return False
    
    def send_data(self, data: bytes) -> bool:
        """Send raw data to printer"""
        try:
            if self.ep_out is None:
                return False
            
            bytes_written = self.ep_out.write(data)
            return bytes_written > 0
            
        except Exception as e:
            print(f"Send error: {e}", file=sys.stderr)
            return False
    
    def send_text(self, text: str) -> bool:
        """Send text to printer"""
        return self.send_data(text.encode('utf-8'))
    
    def initialize_printer(self) -> bool:
        """Initialize printer with ESC/POS commands"""
        return self.send_data(b'\x1B\x40')  # ESC @ - Initialize
    
    def cut_paper(self) -> bool:
        """Cut paper"""
        return self.send_data(b'\x1D\x56\x00')  # GS V 0 - Cut paper
    
    def set_align_center(self) -> bool:
        """Set text alignment to center"""
        return self.send_data(b'\x1B\x61\x01')  # ESC a 1 - Center align
    
    def set_align_left(self) -> bool:
        """Set text alignment to left"""
        return self.send_data(b'\x1B\x61\x00')  # ESC a 0 - Left align
    
    def set_bold_on(self) -> bool:
        """Turn on bold text"""
        return self.send_data(b'\x1B\x45\x01')  # ESC E 1 - Bold on
    
    def set_bold_off(self) -> bool:
        """Turn off bold text"""
        return self.send_data(b'\x1B\x45\x00')  # ESC E 0 - Bold off
    
    def line_feed(self, lines: int = 1) -> bool:
        """Send line feeds"""
        return self.send_data(b'\n' * lines)
    
    def create_receipt(self, receipt_data: Dict[str, Any]) -> bool:
        """Create and print a receipt"""
        try:
            # Initialize
            self.initialize_printer()
            
            # Parse data
            store_name = receipt_data.get('storeName', 'Ken-dal Store')
            store_address = receipt_data.get('storeAddress', '#6024 Purok 6 Kias Baguio City')
            receipt_id = receipt_data.get('id', 'N/A')
            date = receipt_data.get('date', datetime.now().isoformat())
            items = receipt_data.get('items', [])
            total = float(receipt_data.get('total', 0))
            customer_money = float(receipt_data.get('customerMoney', total))
            change = float(receipt_data.get('change', 0))
            
            # Format date
            try:
                parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
                formatted_date = parsed_date.strftime('%Y-%m-%d %H:%M')
            except:
                formatted_date = str(date)
            
            # Header
            self.set_align_center()
            self.set_bold_on()
            self.send_text(f"{store_name}\n")
            self.send_text(f"{store_address}\n")
            self.set_bold_off()
            self.send_text("-" * 32 + "\n")
            self.send_text("SALES RECEIPT\n")
            self.send_text("-" * 32 + "\n")
            self.line_feed()
            
            # Receipt info
            self.set_align_left()
            self.send_text(f"Receipt: {receipt_id}\n")
            self.send_text(f"Date: {formatted_date}\n")
            self.line_feed()
            
            # Items
            self.send_text("ITEMS:\n")
            self.send_text("." * 32 + "\n")
            
            for item in items:
                name = str(item.get('name', 'Unknown Item'))
                quantity = int(item.get('quantity', 1))
                price = float(item.get('price', 0))
                line_total = quantity * price
                
                # Truncate long names
                if len(name) > 20:
                    name = name[:17] + "..."
                
                self.send_text(f"{name}\n")
                self.send_text(f"  {quantity} x P{price:.2f} = P{line_total:.2f}\n")
                self.line_feed()
            
            # Summary
            self.send_text("." * 32 + "\n")
            self.set_bold_on()
            self.send_text(f"TOTAL: P{total:.2f}\n")
            self.set_bold_off()
            self.send_text(f"Cash: P{customer_money:.2f}\n")
            self.send_text(f"Change: P{change:.2f}\n")
            self.line_feed()
            
            # Footer
            self.set_align_center()
            self.send_text("-" * 32 + "\n")
            self.send_text("Thank you!\n")
            self.send_text("Please come again\n")
            self.line_feed(3)
            
            # Cut paper
            self.cut_paper()
            
            return True
            
        except Exception as e:
            print(f"Receipt creation error: {e}", file=sys.stderr)
            return False
    
    def test_print(self) -> bool:
        """Print a test receipt"""
        test_receipt = {
            'storeName': 'Ken-dal Store POS',
            'storeAddress': '#6024 Purok 6 Kias Baguio City',
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
        
        print("Printing test receipt via direct USB...", file=sys.stderr)
        return self.create_receipt(test_receipt)
    
    def list_printers(self) -> List[Dict[str, Any]]:
        """List available XP-58 printers"""
        printers = []
        
        try:
            device = usb.core.find(idVendor=0x0483, idProduct=0x070B)
            if device is not None:
                try:
                    manufacturer = usb.util.get_string(device, device.iManufacturer) if device.iManufacturer else 'Unknown'
                    product = usb.util.get_string(device, device.iProduct) if device.iProduct else 'Unknown'
                except:
                    manufacturer = 'Xprinter'
                    product = 'XP-58'
                
                printers.append({
                    'type': 'usb_direct',
                    'name': 'XP-58 Direct USB',
                    'vendor_id': '0x0483',
                    'product_id': '0x070B',
                    'manufacturer': manufacturer,
                    'product': product,
                    'isDefault': True,
                    'status': 'Ready',
                    'connection': 'USB Direct (PyUSB)'
                })
                
        except Exception as e:
            print(f"Error listing printers: {e}", file=sys.stderr)
        
        return printers
    
    def disconnect(self):
        """Disconnect from printer"""
        if self.device:
            try:
                usb.util.dispose_resources(self.device)
            except:
                pass
            self.device = None
            self.ep_out = None
            self.ep_in = None
    
    def open_cash_drawer(self) -> bool:
        """Open cash drawer connected to thermal printer"""
        try:
            # ESC/POS command to open cash drawer
            drawer_command = b'\x1B\x70\x00\x19\xFA'  # Open drawer pulse
            success = self.send_data(drawer_command)
            if success:
                print("Cash drawer opened successfully", file=sys.stderr)
                return True
            else:
                print("Failed to send cash drawer command", file=sys.stderr)
                return False
        except Exception as e:
            print(f"Error opening cash drawer: {e}", file=sys.stderr)
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='XP-58 Direct USB Printer')
    parser.add_argument('command', choices=['list', 'test', 'print', 'drawer'], 
                       help='Command to execute')
    parser.add_argument('--data', type=str, help='JSON receipt data for printing')
    parser.add_argument('--printer', type=str, help='Printer name (ignored for USB direct)')
    
    args = parser.parse_args()
    
    printer = XP58DirectUSB()
    
    try:
        if args.command == 'list':
            printers = printer.list_printers()
            print(json.dumps(printers, indent=2))
            
        elif args.command == 'test':
            if printer.connect():
                success = printer.test_print()
                printer.disconnect()
                sys.exit(0 if success else 1)
            else:
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
            
            if printer.connect():
                success = printer.create_receipt(receipt_data)
                printer.disconnect()
                sys.exit(0 if success else 1)
            else:
                sys.exit(1)
                
        elif args.command == 'drawer':
            # Open cash drawer
            if printer.connect():
                success = printer.open_cash_drawer()
                printer.disconnect()
                sys.exit(0 if success else 1)
            else:
                sys.exit(1)
                
    except KeyboardInterrupt:
        print("\nCancelled", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 