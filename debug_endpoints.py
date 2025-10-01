#!/usr/bin/env python3

import requests
import json
import time

def test_endpoints():
    base_url = "https://ridesync-10.preview.emergentagent.com"
    
    # Create a test driver
    timestamp = int(time.time())
    driver_data = {
        "email": f"debug_driver_{timestamp}@example.com",
        "password": "TestPassword123!",
        "name": f"Debug Driver {timestamp}",
        "phone": f"+1555{timestamp % 10000:04d}",
        "role": "driver"
    }
    
    # Register driver
    response = requests.post(f"{base_url}/api/auth/register", json=driver_data)
    if response.status_code != 200:
        print(f"Registration failed: {response.status_code} - {response.text}")
        return
    
    data = response.json()
    token = data['access_token']
    print(f"✅ Driver registered successfully: {data['user']['id']}")
    
    # Test location update
    location_data = {
        "location": {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "address": "San Francisco, CA"
        }
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{base_url}/api/location/update", json=location_data, headers=headers)
    print(f"Location update: {response.status_code} - {response.text}")
    
    # Go online
    response = requests.post(f"{base_url}/api/driver/online", headers=headers)
    print(f"Driver online: {response.status_code} - {response.text}")
    
    # Test available rides
    response = requests.get(f"{base_url}/api/rides/available", headers=headers)
    print(f"Available rides: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_endpoints()