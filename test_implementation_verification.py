#!/usr/bin/env python3
"""
Implementation Verification Test
Quick test to verify all QA Enforcement Charter implementations are working
"""

import requests
import json
import time

BASE_URL = "http://localhost:8001"

def test_feature_flags():
    """Test feature flag system"""
    print("🧪 Testing Feature Flag System...")
    
    # Test get feature flags
    response = requests.get(f"{BASE_URL}/api/feature-flags")
    if response.status_code == 200:
        flags = response.json()
        if "realtime.status.deltaV1" in flags:
            print("  ✅ Feature flag exists")
            print(f"  📊 Current value: {flags['realtime.status.deltaV1']}")
        else:
            print("  ❌ Feature flag missing")
            return False
    else:
        print(f"  ❌ Feature flag endpoint failed: {response.status_code}")
        return False
    
    # Test toggle feature flag
    response = requests.post(f"{BASE_URL}/api/feature-flags/realtime.status.deltaV1", 
                           json={"enabled": True})
    if response.status_code == 200:
        print("  ✅ Feature flag toggle works")
    else:
        print(f"  ❌ Feature flag toggle failed: {response.status_code}")
        return False
    
    return True

def test_observability():
    """Test observability system"""
    print("\n🧪 Testing Observability System...")
    
    # Test fanout counter
    response = requests.get(f"{BASE_URL}/api/observability/ride_status_fanout.count")
    if response.status_code == 200:
        data = response.json()
        if "count" in data:
            print("  ✅ Fanout counter endpoint works")
            print(f"  📊 Current count: {data['count']}")
        else:
            print("  ❌ Fanout counter missing 'count' field")
            return False
    else:
        print(f"  ❌ Fanout counter endpoint failed: {response.status_code}")
        return False
    
    # Test push counter
    response = requests.get(f"{BASE_URL}/api/observability/ride_status_push_sent.count")
    if response.status_code == 200:
        data = response.json()
        if "count" in data:
            print("  ✅ Push counter endpoint works")
            print(f"  📊 Current count: {data['count']}")
        else:
            print("  ❌ Push counter missing 'count' field")
            return False
    else:
        print(f"  ❌ Push counter endpoint failed: {response.status_code}")
        return False
    
    # Test latency timer
    response = requests.get(f"{BASE_URL}/api/observability/ride_status_e2e_latency_ms")
    if response.status_code == 200:
        data = response.json()
        if "P50" in data and "P95" in data:
            print("  ✅ Latency timer endpoint works")
            print(f"  📊 P50: {data['P50']}ms, P95: {data['P95']}ms")
        else:
            print("  ❌ Latency timer missing P50/P95 fields")
            return False
    else:
        print(f"  ❌ Latency timer endpoint failed: {response.status_code}")
        return False
    
    return True

def test_sound_profiles():
    """Test sound profiles system"""
    print("\n🧪 Testing Sound Profiles System...")
    
    response = requests.get(f"{BASE_URL}/api/sound-profiles")
    if response.status_code == 200:
        data = response.json()
        if "profiles" in data:
            profiles = data["profiles"]
            required_profiles = ["status_critical", "ride_request", "ride_accepted"]
            
            missing_profiles = []
            for profile in required_profiles:
                if profile not in profiles:
                    missing_profiles.append(profile)
            
            if not missing_profiles:
                print("  ✅ Sound profiles endpoint works")
                print(f"  📊 Available profiles: {list(profiles.keys())}")
            else:
                print(f"  ❌ Missing required profiles: {missing_profiles}")
                return False
        else:
            print("  ❌ Sound profiles missing 'profiles' field")
            return False
    else:
        print(f"  ❌ Sound profiles endpoint failed: {response.status_code}")
        return False
    
    return True

def test_rollback_mechanism():
    """Test rollback mechanism"""
    print("\n🧪 Testing Rollback Mechanism...")
    
    # Disable feature flag
    response = requests.post(f"{BASE_URL}/api/feature-flags/realtime.status.deltaV1", 
                           json={"enabled": False})
    if response.status_code == 200:
        print("  ✅ Feature flag disabled successfully")
        
        # Verify it's disabled
        response = requests.get(f"{BASE_URL}/api/feature-flags")
        if response.status_code == 200:
            flags = response.json()
            if flags.get("realtime.status.deltaV1") == False:
                print("  ✅ Feature flag is OFF")
            else:
                print("  ❌ Feature flag is not OFF")
                return False
        else:
            print("  ❌ Cannot verify feature flag state")
            return False
    else:
        print(f"  ❌ Cannot disable feature flag: {response.status_code}")
        return False
    
    # Re-enable for other tests
    response = requests.post(f"{BASE_URL}/api/feature-flags/realtime.status.deltaV1", 
                           json={"enabled": True})
    if response.status_code == 200:
        print("  ✅ Feature flag re-enabled for other tests")
    else:
        print("  ⚠️  Warning: Could not re-enable feature flag")
    
    return True

def main():
    """Run all verification tests"""
    print("🚀 QA Enforcement Charter - Implementation Verification")
    print("=" * 60)
    
    tests = [
        ("Feature Flag System", test_feature_flags),
        ("Observability System", test_observability),
        ("Sound Profiles System", test_sound_profiles),
        ("Rollback Mechanism", test_rollback_mechanism)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name}: PASSED")
            else:
                failed += 1
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {test_name}: ERROR - {str(e)}")
    
    print("\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/(passed+failed))*100:.1f}%")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ QA Enforcement Charter implementation is working correctly!")
        print("✅ Feature flag system: Working")
        print("✅ Observability system: Working")
        print("✅ Sound profiles system: Working")
        print("✅ Rollback mechanism: Working")
    else:
        print(f"\n⚠️  {failed} tests failed. Check implementation.")
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
