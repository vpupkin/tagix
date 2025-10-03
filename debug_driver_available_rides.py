#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

def test_driver_available_rides():
    """Debug script to test the driver available rides endpoint"""
    base_url = "http://localhost:8001"
    
    print("🔍 Testing Driver Available Rides Endpoint")
    print("=" * 50)
    
    # First, test server connectivity
    print("1. Testing server connectivity...")
    try:
        response = requests.get(f"{base_url}/api/health", timeout=5)
        print(f"   Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"   Health check failed: {e}")
        return False
    
    # Test detailed health check
    print("2. Testing detailed health check...")
    try:
        response = requests.get(f"{base_url}/api/health/detailed", timeout=10)
        print(f"   Detailed health: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"   Detailed health check failed: {e}")
    
    # Create a test driver account
    print("3. Creating test driver account...")
    timestamp = int(time.time())
    driver_data = {
        "email": f"debug_driver_{timestamp}@example.com",
        "password": "TestPassword123!",
        "name": f"Debug Driver {timestamp}",
        "phone": f"+1555{timestamp % 10000:04d}",
        "role": "driver"
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/register", json=driver_data, timeout=10)
        if response.status_code == 200:
            data = response.json()
            token = data['access_token']
            driver_id = data['user']['id']
            print(f"   Driver created: {driver_id}")
        else:
            print(f"   Driver creation failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   Driver creation failed: {e}")
        return False
    
    # Create driver profile
    print("4. Creating driver profile...")
    profile_data = {
        "vehicle_type": "economy",
        "vehicle_make": "Toyota",
        "vehicle_model": "Camry",
        "vehicle_year": 2020,
        "license_plate": "DEBUG123",
        "license_number": "DL987654321"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/driver/profile", 
            json=profile_data, 
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        if response.status_code == 200:
            print("   Driver profile created successfully")
        else:
            print(f"   Driver profile creation failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   Driver profile creation failed: {e}")
    
    # Set driver location
    print("5. Setting driver location...")
    location_data = {
        "location": {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "address": "San Francisco, CA"
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/location/update", 
            json=location_data, 
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        if response.status_code == 200:
            print("   Driver location updated successfully")
        else:
            print(f"   Driver location update failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   Driver location update failed: {e}")
    
    # Set driver online
    print("6. Setting driver online...")
    try:
        response = requests.post(
            f"{base_url}/api/driver/online", 
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        if response.status_code == 200:
            print("   Driver set online successfully")
        else:
            print(f"   Driver online status failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   Driver online status failed: {e}")
    
    # Check driver status
    print("6.5. Checking driver status...")
    try:
        response = requests.get(
            f"{base_url}/api/auth/me", 
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        if response.status_code == 200:
            user_data = response.json()
            print(f"   Driver is_online: {user_data.get('is_online', 'not set')}")
            print(f"   Driver has location: {user_data.get('current_location') is not None}")
        else:
            print(f"   Failed to get driver status: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   Failed to get driver status: {e}")
    
    # Test the available rides endpoint
    print("7. Testing available rides endpoint...")
    try:
        start_time = time.time()
        response = requests.get(
            f"{base_url}/api/rides/available", 
            headers={'Authorization': f'Bearer {token}'},
            timeout=60  # Increased timeout for debugging
        )
        end_time = time.time()
        
        print(f"   Response time: {end_time - start_time:.2f} seconds")
        print(f"   Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Available rides: {data.get('total_available', 0)}")
            print(f"   Total pending: {data.get('total_pending', 0)}")
            print("   ✅ Available rides endpoint working!")
            return True
        else:
            print(f"   Response: {response.text}")
            print("   ❌ Available rides endpoint failed")
            return False
            
    except requests.exceptions.Timeout:
        print("   ❌ Request timed out after 60 seconds")
        return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    success = test_driver_available_rides()
    if success:
        print("\n🎉 All tests passed!")
    else:
        print("\n💥 Some tests failed!")