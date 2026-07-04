#!/usr/bin/env python3
"""Check USB devices"""

try:
    import usb.core
    devices = list(usb.core.find(find_all=True))
    print(f"Found {len(devices)} USB devices:")
    for d in devices:
        print(f"VID: {hex(d.idVendor)}, PID: {hex(d.idProduct)}")
        if d.idVendor == 0x0483 and d.idProduct == 0x0011:
            print("  -> This is the XP-58 thermal printer!")
except Exception as e:
    print(f"USB check failed: {e}")

try:
    from escpos.printer import Usb
    print("\nTrying to connect to XP-58...")
    printer = Usb(0x0483, 0x0011)
    print("✅ XP-58 connected successfully via USB!")
    printer.close()
except Exception as e:
    print(f"❌ XP-58 USB connection failed: {e}") 