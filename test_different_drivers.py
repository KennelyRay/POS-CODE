#!/usr/bin/env python3
"""
Test Different USB Approaches for XP-58
"""

import sys
import time

def test_method_1_pyusb():
    """Method 1: Pure PyUSB (like test_raw_usb.py)"""
    print("="*50)
    print("METHOD 1: Pure PyUSB")
    print("="*50)
    try:
        import usb.core
        import usb.util
        
        device = usb.core.find(idVendor=0x0483, idProduct=0x070B)
        if device is None:
            print("❌ Device not found with PyUSB")
            return False
        
        print("✅ Device found with PyUSB")
        print(f"   Device: {device}")
        
        # Try to communicate
        device.set_configuration()
        cfg = device.get_active_configuration()
        intf = cfg[(0,0)]
        
        ep_out = None
        for ep in intf:
            if usb.util.endpoint_direction(ep.bEndpointAddress) == usb.util.ENDPOINT_OUT:
                ep_out = ep
                break
        
        if ep_out:
            ep_out.write(b"TEST PyUSB\n")
            print("✅ Data sent via PyUSB")
            return True
        else:
            print("❌ No OUT endpoint found")
            return False
            
    except Exception as e:
        print(f"❌ PyUSB failed: {e}")
        return False

def test_method_2_escpos_with_timeout():
    """Method 2: python-escpos with custom timeout"""
    print("="*50)
    print("METHOD 2: python-escpos with timeout")
    print("="*50)
    try:
        from escpos.printer import Usb
        
        # Try with custom timeout
        printer = Usb(0x0483, 0x070B, timeout=1000, in_ep=0x81, out_ep=0x02)
        printer.text("TEST escpos timeout\n")
        printer.close()
        print("✅ python-escpos with timeout worked")
        return True
        
    except Exception as e:
        print(f"❌ python-escpos with timeout failed: {e}")
        return False

def test_method_3_escpos_different_endpoints():
    """Method 3: Try different endpoint addresses"""
    print("="*50)
    print("METHOD 3: Different endpoints")
    print("="*50)
    
    endpoint_combinations = [
        (0x81, 0x02),  # Common
        (0x82, 0x01),  # Alternative
        (0x83, 0x03),  # Alternative
        (None, None),  # Auto-detect
    ]
    
    for in_ep, out_ep in endpoint_combinations:
        try:
            from escpos.printer import Usb
            print(f"   Trying endpoints: IN={in_ep}, OUT={out_ep}")
            
            if in_ep and out_ep:
                printer = Usb(0x0483, 0x070B, in_ep=in_ep, out_ep=out_ep)
            else:
                printer = Usb(0x0483, 0x070B)
            
            printer.text("TEST endpoints\n")
            printer.close()
            print(f"✅ Endpoints IN={in_ep}, OUT={out_ep} worked!")
            return True
            
        except Exception as e:
            print(f"   ❌ Endpoints IN={in_ep}, OUT={out_ep} failed: {e}")
    
    return False

def test_method_4_list_all_devices():
    """Method 4: List all USB devices to verify detection"""
    print("="*50)
    print("METHOD 4: List all USB devices")
    print("="*50)
    try:
        import usb.core
        
        print("All USB devices:")
        devices = usb.core.find(find_all=True)
        found_xp58 = False
        
        for device in devices:
            vid = device.idVendor
            pid = device.idProduct
            print(f"   VID: {vid:04x} ({vid}), PID: {pid:04x} ({pid})")
            
            if vid == 0x0483:
                print(f"      ^^ This is 0x0483 (XP-58 vendor)")
                if pid == 0x070B:
                    print("         ^^ This is 0x070B (your XP-58!)")
                    found_xp58 = True
        
        if found_xp58:
            print("✅ XP-58 detected in USB device list")
        else:
            print("❌ XP-58 NOT found in USB device list")
            print("   Check: Is printer on? Is driver installed?")
        
        return found_xp58
        
    except Exception as e:
        print(f"❌ USB device listing failed: {e}")
        return False

def test_method_5_check_driver():
    """Method 5: Check Windows driver status"""
    print("="*50)
    print("METHOD 5: Check Windows driver")
    print("="*50)
    try:
        import subprocess
        
        # Use wmic to check device status
        cmd = 'wmic path Win32_PnPEntity where "DeviceID like \'%VID_0483&PID_070B%\'" get Name,Status,DriverVersion'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0 and result.stdout.strip():
            print("Windows device info:")
            print(result.stdout)
            return True
        else:
            print("❌ Could not get Windows device info")
            return False
            
    except Exception as e:
        print(f"❌ Windows driver check failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🔧 XP-58 USB Direct Printing Diagnostic Tool")
    print("This will test multiple methods to fix your USB printing error.")
    print()
    
    tests = [
        ("Check USB Device Detection", test_method_4_list_all_devices),
        ("Check Windows Driver", test_method_5_check_driver),
        ("Pure PyUSB Method", test_method_1_pyusb),
        ("python-escpos with Timeout", test_method_2_escpos_with_timeout),
        ("Different Endpoints", test_method_3_escpos_different_endpoints),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ Test crashed: {e}")
            results[test_name] = False
        
        time.sleep(1)  # Brief pause between tests
    
    # Summary
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    for test_name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    if any(results.values()):
        print("\n🎉 At least one method worked! Use the successful method.")
    else:
        print("\n😞 All methods failed. Your XP-58 may not support direct USB ESC/POS.")
        print("   Recommendation: Use Windows printing instead (simple_windows_printer.py)")

if __name__ == "__main__":
    main() 