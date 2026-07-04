#!/usr/bin/env python3
"""
Simple XP-58 Test Script
Basic printing test without complex formatting
"""

import sys
from escpos.printer import Usb

def test_xp58_basic():
    """Test XP-58 with basic commands only"""
    try:
        # Connect to your XP-58 (VID: 0x483, PID: 0x70B)
        printer = Usb(0x0483, 0x070B)
        
        print("Connected to XP-58 printer successfully!")
        
        # Simple text without formatting
        printer.text("=== KEN-DAL STORE ===\n")
        printer.text("Test Receipt\n")
        printer.text("=====================\n")
        printer.text("\n")
        printer.text("Item 1: Test Product\n")
        printer.text("Qty: 1 x P15.50\n")
        printer.text("Total: P15.50\n")
        printer.text("\n")
        printer.text("Thank you!\n")
        printer.text("\n\n\n")
        
        # Try to cut paper
        try:
            printer.cut()
            print("Paper cut successfully")
        except:
            printer.text("---- END RECEIPT ----\n")
            print("Cut not supported, added separator")
        
        printer.close()
        print("Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_xp58_basic() 