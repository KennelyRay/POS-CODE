#!/usr/bin/env python3
"""
Simple Windows Printer for Ken-dal Store POS System
Creates formatted text receipts and opens Windows print dialog
"""

import sys
import json
import argparse
import tempfile
import os
import subprocess
import webbrowser
from datetime import datetime
from typing import Dict, List, Any

class SimplePrinter:
    """Simple Windows printer using text files and system print dialog"""
    
    def create_receipt_text(self, receipt_data: Dict[str, Any]) -> str:
        """Create formatted text receipt"""
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
        
        # Create receipt text
        lines = []
        lines.append("=" * 40)
        lines.append(f"{store_name:^40}")
        lines.append(f"{store_address:^40}")
        lines.append("=" * 40)
        lines.append(f"{'SALES RECEIPT':^40}")
        lines.append("=" * 40)
        lines.append("")
        lines.append(f"Receipt: {receipt_id}")
        lines.append(f"Date: {formatted_date}")
        lines.append("")
        lines.append("ITEMS PURCHASED:")
        lines.append("-" * 40)
        
        # Add items
        for item in items:
            name = str(item.get('name', 'Unknown Item'))
            quantity = int(item.get('quantity', 1))
            price = float(item.get('price', 0))
            line_total = quantity * price
            
            # Truncate long names
            if len(name) > 30:
                name = name[:27] + "..."
            
            lines.append(name)
            line = f"  {quantity} x ₱{price:.2f}"
            total_str = f"₱{line_total:.2f}"
            spaces_needed = 40 - len(line) - len(total_str)
            if spaces_needed > 0:
                lines.append(line + " " * spaces_needed + total_str)
            else:
                lines.append(line)
                lines.append(f"{total_str:>40}")
            lines.append("")
        
        lines.append("=" * 40)
        lines.append("PAYMENT SUMMARY:")
        lines.append("-" * 40)
        
        # Subtotal
        subtotal_line = f"Subtotal:"
        subtotal_amount = f"₱{total:.2f}"
        spaces = 40 - len(subtotal_line) - len(subtotal_amount)
        lines.append(subtotal_line + " " * max(1, spaces) + subtotal_amount)
        
        # Total
        total_line = f"TOTAL:"
        total_amount = f"₱{total:.2f}"
        spaces = 40 - len(total_line) - len(total_amount)
        lines.append(total_line + " " * max(1, spaces) + total_amount)
        
        lines.append("")
        
        # Payment
        cash_line = f"Cash Paid:"
        cash_amount = f"₱{customer_money:.2f}"
        spaces = 40 - len(cash_line) - len(cash_amount)
        lines.append(cash_line + " " * max(1, spaces) + cash_amount)
        
        change_line = f"Change:"
        change_amount = f"₱{change:.2f}"
        spaces = 40 - len(change_line) - len(change_amount)
        lines.append(change_line + " " * max(1, spaces) + change_amount)
        
        lines.append("")
        lines.append("=" * 40)
        lines.append(f"{'Thank you for your purchase!':^40}")
        lines.append(f"{'Please come again.':^40}")
        lines.append("")
        lines.append(f"Receipt ID: {receipt_id[-8:]}")
        lines.append("=" * 40)
        
        return "\n".join(lines)
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> bool:
        """Print receipt using Windows notepad"""
        try:
            # Create text receipt
            receipt_text = self.create_receipt_text(receipt_data)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(receipt_text)
                temp_file_path = temp_file.name
            
            # Open with notepad and print
            cmd = ['notepad', '/p', temp_file_path]
            subprocess.Popen(cmd)
            
            print(f"Receipt sent to printer via Notepad: {receipt_data.get('id', 'N/A')}", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Print error: {e}", file=sys.stderr)
            return False
    
    def print_receipt_html(self, receipt_data: Dict[str, Any]) -> bool:
        """Print receipt using HTML and browser"""
        try:
            html_content = self.create_receipt_html(receipt_data)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(html_content)
                temp_file_path = temp_file.name
            
            # Open with default browser
            webbrowser.open(f'file://{temp_file_path}')
            
            print(f"Receipt opened in browser: {receipt_data.get('id', 'N/A')}", file=sys.stderr)
            print("Please use Ctrl+P to print the receipt.", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Print error: {e}", file=sys.stderr)
            return False
    
    def create_receipt_html(self, receipt_data: Dict[str, Any]) -> str:
        """Create simple HTML receipt"""
        store_name = receipt_data.get('storeName', 'Ken-dal Store')
        store_address = receipt_data.get('storeAddress', '123 Main Street')
        receipt_id = receipt_data.get('id', 'N/A')
        date = receipt_data.get('date', datetime.now().isoformat())
        items = receipt_data.get('items', [])
        total = float(receipt_data.get('total', 0))
        customer_money = float(receipt_data.get('customerMoney', total))
        change = float(receipt_data.get('change', 0))
        
        try:
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            formatted_date = parsed_date.strftime('%Y-%m-%d %H:%M:%S')
        except:
            formatted_date = str(date)
        
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Receipt {receipt_id}</title>
    <style>
        body {{ font-family: 'Courier New', monospace; font-size: 14px; max-width: 300px; margin: 20px auto; }}
        .center {{ text-align: center; }}
        .line {{ border-top: 1px dashed #000; margin: 10px 0; }}
        .total {{ font-weight: bold; font-size: 16px; }}
        .flex {{ display: flex; justify-content: space-between; }}
    </style>
</head>
<body>
    <div class="center">
        <h2>{store_name}</h2>
        <p>{store_address}</p>
        <div class="line"></div>
        <h3>SALES RECEIPT</h3>
        <div class="line"></div>
    </div>
    
    <p><strong>Receipt:</strong> {receipt_id}</p>
    <p><strong>Date:</strong> {formatted_date}</p>
    
    <div class="line"></div>
    
    <h4>ITEMS PURCHASED:</h4>
"""
        
        for item in items:
            name = str(item.get('name', 'Unknown Item'))
            quantity = int(item.get('quantity', 1))
            price = float(item.get('price', 0))
            line_total = quantity * price
            
            html += f"""
    <div>
        <strong>{name}</strong><br>
        <div class="flex">
            <span>{quantity} x ₱{price:.2f}</span>
            <span>₱{line_total:.2f}</span>
        </div>
    </div>
    <br>
"""
        
        html += f"""
    <div class="line"></div>
    
    <div class="flex"><span>Subtotal:</span><span>₱{total:.2f}</span></div>
    <div class="flex total"><span>TOTAL:</span><span>₱{total:.2f}</span></div>
    
    <div class="line"></div>
    
    <div class="flex"><span>Cash Paid:</span><span>₱{customer_money:.2f}</span></div>
    <div class="flex"><span>Change:</span><span>₱{change:.2f}</span></div>
    
    <div class="line"></div>
    
    <div class="center">
        <p><em>Thank you for your purchase!</em></p>
        <p><em>Please come again.</em></p>
        <br>
        <small>Receipt ID: {receipt_id[-8:]}</small>
    </div>
    
    <script>
        // Auto-print after page loads
        window.onload = function() {{
            setTimeout(function() {{
                window.print();
            }}, 1000);
        }};
    </script>
</body>
</html>"""
        return html
    
    def test_print(self) -> bool:
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
        
        print("Opening test receipt for printing...", file=sys.stderr)
        return self.print_receipt_html(test_receipt)

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Simple Printer for Ken-dal Store POS')
    parser.add_argument('command', choices=['test', 'print', 'print-text'], 
                       help='Command to execute')
    parser.add_argument('--data', type=str, help='JSON receipt data for printing')
    
    args = parser.parse_args()
    
    printer = SimplePrinter()
    
    try:
        if args.command == 'test':
            success = printer.test_print()
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
            
            success = printer.print_receipt_html(receipt_data)
            sys.exit(0 if success else 1)
            
        elif args.command == 'print-text':
            if not args.data:
                print("Error: --data parameter required", file=sys.stderr)
                sys.exit(1)
            
            try:
                receipt_data = json.loads(args.data)
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON: {e}", file=sys.stderr)
                sys.exit(1)
            
            success = printer.print_receipt(receipt_data)
            sys.exit(0 if success else 1)
                
    except KeyboardInterrupt:
        print("\nCancelled", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 