#!/usr/bin/env python3

import requests
import json

def test_backend_connectivity():
    """Simple test to check if backend is accessible"""
    base_url = "http://localhost:8001"
    
    print("🚀 Testing MobilityHub Backend Connectivity")
    print("=" * 50)
    
    # Test 1: Basic connectivity
    try:
        response = requests.get(f"{base_url}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running and accessible")
        else:
            print(f"⚠️ Backend responded with status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend at http://localhost:8001")
        print("   Make sure your backend server is running with: python server.py")
        return False
    except requests.exceptions.Timeout:
        print("❌ Backend connection timed out")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    # Test 2: Try a simple registration
    try:
        test_user = {
            "email": "test@example.com",
            "password": "testpass123",
            "name": "Test User",
            "phone": "+1234567890",
            "role": "rider"
        }
        
        response = requests.post(f"{base_url}/api/auth/register", json=test_user, timeout=10)
        if response.status_code == 200:
            print("✅ Registration endpoint working")
            data = response.json()
            
            # Test 3: Try login
            login_data = {
                "email": test_user["email"],
                "password": test_user["password"]
            }
            
            login_response = requests.post(f"{base_url}/api/auth/login", json=login_data, timeout=10)
            if login_response.status_code == 200:
                print("✅ Login endpoint working")
                token = login_response.json()["access_token"]
                
                # Test 4: Try authenticated endpoint
                headers = {"Authorization": f"Bearer {token}"}
                me_response = requests.get(f"{base_url}/api/auth/me", headers=headers, timeout=10)
                if me_response.status_code == 200:
                    print("✅ Authentication working")
                    print(f"   User: {me_response.json()['name']}")
                    return True
                else:
                    print(f"❌ Auth endpoint failed: {me_response.status_code}")
            else:
                print(f"❌ Login failed: {login_response.status_code}")
                print(f"   Response: {login_response.text}")
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False
    
    return False

if __name__ == "__main__":
    success = test_backend_connectivity()
    if success:
        print("\n🎉 Backend is working correctly!")
    else:
        print("\n⚠️ Backend has issues. Check the errors above.")
        print("\nTroubleshooting steps:")
        print("1. Make sure backend server is running: cd ~/git/tagix/backend && python server.py")
        print("2. Check if MongoDB is running: sudo systemctl status mongod")
        print("3. Verify backend URL in terminal shows: http://0.0.0.0:8001")