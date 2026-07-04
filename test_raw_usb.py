#!/usr/bin/env python3
"""
Raw USB Test for XP-58 - Bypass python-escpos
Direct USB communication using PyUSB only
"""

import sys
import usb.core
import usb.util

def test_raw_usb():
    """Test raw USB communication with XP-58"""
    try:
        # Find the XP-58 device
        print("Looking for XP-58 at VID: 0x0483, PID: 0x070B...")
        device = usb.core.find(idVendor=0x0483, idProduct=0x070B)
        
        if device is None:
            print("❌ XP-58 not found! Check:")
            print("  1. Printer is plugged in and powered on")
            print("  2. libusb-win32 driver is installed in Zadig")
            print("  3. Correct VID:PID (0x0483:0x070B)")
            return False
        
        print("✅ XP-58 found!")
        print(f"   Device: {device}")
        print(f"   Manufacturer: {usb.util.get_string(device, device.iManufacturer) if device.iManufacturer else 'Unknown'}")
        print(f"   Product: {usb.util.get_string(device, device.iProduct) if device.iProduct else 'Unknown'}")
        
        # Detach kernel driver if attached (Linux/Mac)
        try:
            if device.is_kernel_driver_active(0):
                device.detach_kernel_driver(0)
                print("   Detached kernel driver")
        except:
            pass  # Windows doesn't need this
        
        # Set configuration
        try:
            device.set_configuration()
            print("   Configuration set successfully")
        except Exception as e:
            print(f"   Warning: Could not set configuration: {e}")
        
        # Find endpoints
        cfg = device.get_active_configuration()
        intf = cfg[(0,0)]
        
        # Find OUT endpoint (for sending data to printer)
        ep_out = None
        ep_in = None
        
        for ep in intf:
            if usb.util.endpoint_direction(ep.bEndpointAddress) == usb.util.ENDPOINT_OUT:
                ep_out = ep
                print(f"   Found OUT endpoint: {hex(ep.bEndpointAddress)}")
            elif usb.util.endpoint_direction(ep.bEndpointAddress) == usb.util.ENDPOINT_IN:
                ep_in = ep
                print(f"   Found IN endpoint: {hex(ep.bEndpointAddress)}")
        
        if ep_out is None:
            print("❌ No OUT endpoint found!")
            return False
        
        # Test 1: Send ESC/POS initialize command
        print("\n🧪 Test 1: Sending ESC/POS initialize command...")
        init_cmd = b'\x1B\x40'  # ESC @ - Initialize printer
        try:
            bytes_written = ep_out.write(init_cmd)
            print(f"   ✅ Sent {bytes_written} bytes (initialize)")
        except Exception as e:
            print(f"   ❌ Failed to send initialize: {e}")
            return False
        
        # Test 2: Send simple text
        print("\n🧪 Test 2: Sending simple text...")
        text_data = b"Hello XP-58!\n"
        try:
            bytes_written = ep_out.write(text_data)
            print(f"   ✅ Sent {bytes_written} bytes (text)")
        except Exception as e:
            print(f"   ❌ Failed to send text: {e}")
            return False
        
        # Test 3: Send line feed and cut
        print("\n🧪 Test 3: Sending line feeds and cut...")
        try:
            ep_out.write(b"\n\n\n")  # Line feeds
            ep_out.write(b'\x1D\x56\x00')  # Cut paper (GS V 0)
            print("   ✅ Sent line feeds and cut command")
        except Exception as e:
            print(f"   ❌ Failed to send cut: {e}")
        
        print("\n🎉 Raw USB communication successful!")
        print("   If nothing printed, your XP-58 may not support ESC/POS over USB.")
        return True
        
    except Exception as e:
        print(f"❌ Raw USB test failed: {e}")
        return False
    
    finally:
        try:
            usb.util.dispose_resources(device)
        except:
            pass

if __name__ == "__main__":
    test_raw_usb() 