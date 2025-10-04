#!/usr/bin/env python3
"""
Check driver API directly
"""

import requests
import json

# Test the driver API
driver_id = "e330b58f-b723-44f5-b7ab-04fa2659b7eb"
base_url = "http://localhost:8001"

# First, let's check if the backend is running
try:
    response = requests.get(f"{base_url}/api/health")
    print(f"✅ Backend is running: {response.status_code}")
except Exception as e:
    print(f"❌ Backend not running: {e}")
    exit(1)

# Get driver token (we'll need to login first)
login_data = {
    "email": "driver@yourdomain.com",
    "password": "password123"
}

try:
    login_response = requests.post(f"{base_url}/api/auth/login", json=login_data)
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        print(f"✅ Driver logged in successfully")
        
        # Now check available rides
        headers = {"Authorization": f"Bearer {token}"}
        rides_response = requests.get(f"{base_url}/api/rides/available", headers=headers)
        
        print(f"📊 Available rides response: {rides_response.status_code}")
        if rides_response.status_code == 200:
            data = rides_response.json()
            print(f"   Available rides: {len(data.get('available_rides', []))}")
            print(f"   Total pending: {len(data.get('all_pending_requests', []))}")
            print(f"   Driver location: {data.get('driver_location')}")
            
            # Show details of pending requests
            for i, request in enumerate(data.get('all_pending_requests', [])[:3], 1):
                print(f"   Request {i}:")
                print(f"     Distance: {request.get('distance_to_pickup', 'N/A')} km")
                print(f"     Pickup: {request.get('pickup_location', {}).get('address', 'No address')}")
                print(f"     Available: {request.get('distance_to_pickup', 999) <= 10}")
        else:
            print(f"❌ Error: {rides_response.text}")
            
    else:
        print(f"❌ Login failed: {login_response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
