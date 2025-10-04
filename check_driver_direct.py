#!/usr/bin/env python3
"""
Check driver data directly via API without login
"""

import requests
import json

base_url = "http://localhost:8001"

# Let's try to get user info directly
driver_id = "e330b58f-b723-44f5-b7ab-04fa2659b7eb"

# Check if we can get user info
try:
    # Try to get user by ID (this might not work without auth)
    response = requests.get(f"{base_url}/api/users/{driver_id}")
    print(f"User info response: {response.status_code}")
    if response.status_code == 200:
        print(f"User data: {response.json()}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error getting user info: {e}")

# Let's check the health endpoint for more info
try:
    response = requests.get(f"{base_url}/api/health/detailed")
    print(f"\nDetailed health response: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Database status: {data.get('database', 'Unknown')}")
        print(f"Total users: {data.get('total_users', 'Unknown')}")
        print(f"Total ride requests: {data.get('total_ride_requests', 'Unknown')}")
except Exception as e:
    print(f"Error getting health info: {e}")

# Let's try to login with the existing test driver
test_driver_login = {
    "email": "test_driver_debug@example.com",
    "password": "TestPassword123!"
}

try:
    response = requests.post(f"{base_url}/api/auth/login", json=test_driver_login)
    print(f"\nTest driver login: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Test driver logged in: {data['user']['id']}")
        token = data['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        
        # First, set a location for the driver
        location_data = {
            "location": {
                "latitude": 48.7758,  # Stuttgart, Germany
                "longitude": 9.1829,
                "address": "Stuttgart, Germany"
            }
        }
        
        location_response = requests.post(f"{base_url}/api/location/update", 
                                        json=location_data, headers=headers)
        print(f"Set location response: {location_response.status_code}")
        
        # Set driver online
        online_response = requests.post(f"{base_url}/api/driver/online", headers=headers)
        print(f"Set online response: {online_response.status_code}")
        
        # Now test available rides with this driver
        rides_response = requests.get(f"{base_url}/api/rides/available", headers=headers)
        
        print(f"Available rides response: {rides_response.status_code}")
        if rides_response.status_code == 200:
            rides_data = rides_response.json()
            print(f"Available rides: {len(rides_data.get('available_rides', []))}")
            print(f"Total pending: {len(rides_data.get('all_pending_requests', []))}")
            print(f"Driver location: {rides_data.get('driver_location')}")
            
            # Show details of pending requests
            for i, request in enumerate(rides_data.get('all_pending_requests', [])[:3], 1):
                print(f"Request {i}:")
                print(f"  Distance: {request.get('distance_to_pickup', 'N/A')} km")
                print(f"  Pickup: {request.get('pickup_location', {}).get('address', 'No address')}")
                print(f"  Available: {request.get('distance_to_pickup', 999) <= 10}")
        else:
            print(f"Error: {rides_response.text}")
    else:
        print(f"Login failed: {response.text}")
except Exception as e:
    print(f"Error with test driver: {e}")
