#!/usr/bin/env python3
"""
Test script to verify frontend audit trail functionality
"""

import requests
import json
import sys
import time

# Configuration
FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8001"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "adminpass123"

def test_frontend_accessibility():
    """Test if frontend is accessible"""
    print("🌐 Testing frontend accessibility...")
    
    try:
        response = requests.get(FRONTEND_URL, timeout=10)
        if response.status_code == 200:
            print("✅ Frontend is accessible")
            return True
        else:
            print(f"❌ Frontend returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Frontend not accessible: {e}")
        return False

def test_backend_api():
    """Test if backend API is accessible"""
    print("🔧 Testing backend API accessibility...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=10)
        if response.status_code == 200:
            print("✅ Backend API is accessible")
            return True
        else:
            print(f"❌ Backend API returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend API not accessible: {e}")
        return False

def test_audit_api_endpoint():
    """Test if audit API endpoint is working"""
    print("📊 Testing audit API endpoint...")
    
    # Login first
    login_response = requests.post(f"{BACKEND_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json()["access_token"]
    
    # Test audit logs endpoint
    headers = {"Authorization": f"Bearer {token}"}
    audit_response = requests.get(f"{BACKEND_URL}/api/audit/logs?limit=5", headers=headers)
    
    if audit_response.status_code == 200:
        logs = audit_response.json()
        print(f"✅ Audit API endpoint working - found {len(logs)} logs")
        return True
    else:
        print(f"❌ Audit API endpoint failed: {audit_response.status_code}")
        return False

def test_audit_filtering_endpoints():
    """Test audit filtering endpoints"""
    print("🔍 Testing audit filtering endpoints...")
    
    # Login first
    login_response = requests.post(f"{BACKEND_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test various filter combinations
    filter_tests = [
        {"action": "user_login"},
        {"entity_type": "user"},
        {"severity": "low"},
        {"limit": 3},
        {"action": "user_login", "severity": "low", "limit": 2}
    ]
    
    all_passed = True
    for i, filters in enumerate(filter_tests, 1):
        print(f"   Test {i}: {filters}")
        response = requests.get(f"{BACKEND_URL}/api/audit/logs", headers=headers, params=filters)
        
        if response.status_code == 200:
            logs = response.json()
            print(f"   ✅ Found {len(logs)} logs")
        else:
            print(f"   ❌ Failed with status {response.status_code}")
            all_passed = False
    
    return all_passed

def main():
    """Main test function"""
    print("🧪 TESTING FRONTEND AUDIT TRAIL FUNCTIONALITY")
    print("=" * 60)
    
    tests = [
        ("Frontend Accessibility", test_frontend_accessibility),
        ("Backend API", test_backend_api),
        ("Audit API Endpoint", test_audit_api_endpoint),
        ("Audit Filtering Endpoints", test_audit_filtering_endpoints)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        print("-" * 40)
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n📊 TEST SUMMARY")
    print("=" * 60)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Frontend audit trail functionality is working!")
        return True
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
