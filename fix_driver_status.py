#!/usr/bin/env python3
"""
Fix driver status and test available rides
"""

import requests
import json

BASE_URL = "http://localhost:8001/api"

def get_driver_token():
    """Get a valid driver token"""
    login_data = {
        "email": "debug_driver@test.com",
        "password": "testpass123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data["access_token"]
    return None

def setup_driver(token):
    """Setup driver location and online status"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Set location
    location_data = {
        "location": {
            "latitude": 37.7750,
            "longitude": -122.4195,
            "address": "Driver Location, San Francisco, CA"
        }
    }
    
    print("Setting driver location...")
    response = requests.post(f"{BASE_URL}/location/update", json=location_data, headers=headers)
    print(f"Location update: {response.status_code}")
    
    # Set online
    print("Setting driver online...")
    response = requests.post(f"{BASE_URL}/driver/online", headers=headers)
    print(f"Online status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")

def test_available_rides(token):
    """Test available rides endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\nTesting /rides/available endpoint:")
    response = requests.get(f"{BASE_URL}/rides/available", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Available rides endpoint working!")
        print(f"Available rides: {data.get('total_available', 0)}")
        print(f"Total pending: {data.get('total_pending', 0)}")
        print(f"Response structure: {list(data.keys())}")
    else:
        print(f"❌ Error: {response.text}")

def test_unified_endpoint(token):
    """Test unified endpoint for comparison"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\nTesting /rides/unified endpoint:")
    response = requests.get(f"{BASE_URL}/rides/unified", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Unified endpoint working!")
        stats = data.get('statistics', {})
        print(f"Available: {stats.get('total_available', 0)}")
        print(f"Completed: {stats.get('total_completed', 0)}")
    else:
        print(f"❌ Error: {response.text}")

if __name__ == "__main__":
    token = get_driver_token()
    if token:
        print(f"Got token: {token[:20]}...")
        setup_driver(token)
        test_available_rides(token)
        test_unified_endpoint(token)
    else:
        print("Failed to get token")
