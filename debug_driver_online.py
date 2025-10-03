#!/usr/bin/env python3
"""
Debug driver online status issue
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

def check_driver_status(token):
    """Check current driver status"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Checking driver profile...")
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Driver online status: {data.get('is_online', 'unknown')}")
        print(f"Driver location: {data.get('current_location', 'none')}")
        return data.get('is_online', False)
    else:
        print(f"Failed to get driver status: {response.status_code}")
        return False

def toggle_driver_online(token):
    """Toggle driver online status"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Toggling driver online status...")
    response = requests.post(f"{BASE_URL}/driver/online", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Toggle response: {data}")
        return True
    else:
        print(f"Failed to toggle: {response.status_code} - {response.text}")
        return False

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
    else:
        print(f"❌ Error: {response.text}")

if __name__ == "__main__":
    token = get_driver_token()
    if token:
        print(f"Got token: {token[:20]}...")
        
        # Check initial status
        initial_status = check_driver_status(token)
        
        # Toggle to online
        toggle_driver_online(token)
        
        # Check status after toggle
        final_status = check_driver_status(token)
        
        # Test available rides
        test_available_rides(token)
        
        print(f"\nStatus change: {initial_status} -> {final_status}")
    else:
        print("Failed to get token")
