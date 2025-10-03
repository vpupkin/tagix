#!/usr/bin/env python3
"""
Simple script to get a valid token and test endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8001/api"

def get_driver_token():
    """Get a valid driver token"""
    # Try to login with existing user
    login_data = {
        "email": "debug_driver@test.com",
        "password": "testpass123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_endpoints(token):
    """Test both endpoints with valid token"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Testing /rides/available endpoint:")
    response = requests.get(f"{BASE_URL}/rides/available", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Error: {response.text}")
    
    print("\nTesting /rides/unified endpoint:")
    response = requests.get(f"{BASE_URL}/rides/unified", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Role: {data.get('role')}")
        stats = data.get('statistics', {})
        print(f"Statistics: {stats}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    token = get_driver_token()
    if token:
        print(f"Got token: {token[:20]}...")
        test_endpoints(token)
    else:
        print("Failed to get token")
