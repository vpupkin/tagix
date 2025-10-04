#!/usr/bin/env python3
"""
Debug script to investigate the specific ride showing 'Unassigned' driver
"""

import requests
import json

base_url = "http://localhost:8001"

def debug_specific_ride():
    print("🔍 Debugging Specific Ride: 0857dfbe")
    print("=" * 50)
    
    try:
        # 1. Login as admin
        print("1. Logging in as admin...")
        admin_login = {
            "email": "admin@test.com",
            "password": "adminpass123"
        }
        
        response = requests.post(f"{base_url}/api/auth/login", json=admin_login)
        if response.status_code != 200:
            print(f"❌ Admin login failed: {response.status_code} - {response.text}")
            return False
        
        admin_data = response.json()
        admin_token = admin_data['access_token']
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print(f"✅ Admin logged in: {admin_data['user']['name']}")
        
        # 2. Fetch rides and find the specific ride
        print("\n2. Fetching rides to find ride 0857dfbe...")
        response = requests.get(f"{base_url}/api/admin/rides/filtered", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch rides: {response.status_code} - {response.text}")
            return False
        
        rides_data = response.json()
        pending_requests = rides_data.get('pending_requests', [])
        completed_matches = rides_data.get('completed_matches', [])
        
        # Search for the specific ride
        target_ride = None
        target_location = None
        
        for request in pending_requests:
            if request.get('id', '').endswith('0857dfbe'):
                target_ride = request
                target_location = 'pending_requests'
                break
        
        if not target_ride:
            for match in completed_matches:
                if match.get('id', '').endswith('0857dfbe'):
                    target_ride = match
                    target_location = 'completed_matches'
                    break
        
        if not target_ride:
            print("❌ Could not find ride with ID ending in 0857dfbe")
            print("Available ride IDs:")
            for request in pending_requests[:5]:
                print(f"  Pending: {request.get('id', 'N/A')}")
            for match in completed_matches[:5]:
                print(f"  Completed: {match.get('id', 'N/A')}")
            return False
        
        print(f"✅ Found ride in {target_location}")
        
        # 3. Analyze the specific ride
        print(f"\n3. Analyzing ride {target_ride.get('id', 'N/A')}:")
        print(f"   Full ID: {target_ride.get('id', 'N/A')}")
        print(f"   Status: {target_ride.get('status', 'N/A')}")
        print(f"   Driver ID: {target_ride.get('driver_id', 'N/A')}")
        print(f"   Driver Name: {target_ride.get('driver_name', 'NOT_SET')}")
        print(f"   Rider ID: {target_ride.get('rider_id', 'N/A')}")
        print(f"   Rider Name: {target_ride.get('rider_name', 'NOT_SET')}")
        print(f"   Pickup: {target_ride.get('pickup_location', {}).get('address', 'N/A')}")
        print(f"   Dropoff: {target_ride.get('dropoff_location', {}).get('address', 'N/A')}")
        print(f"   Fare: ${target_ride.get('estimated_fare', 'N/A')}")
        
        # 4. Check if the driver ID exists in users
        driver_id = target_ride.get('driver_id')
        if driver_id:
            print(f"\n4. Checking if driver ID {driver_id[:8]} exists in users...")
            
            # Get users to check
            response = requests.get(f"{base_url}/api/admin/users", headers=admin_headers)
            if response.status_code == 200:
                users = response.json()
                driver_found = False
                for user in users:
                    if user.get('id') == driver_id:
                        print(f"   ✅ Driver found: {user.get('name', 'N/A')} - {user.get('email', 'N/A')}")
                        driver_found = True
                        break
                
                if not driver_found:
                    print(f"   ❌ Driver ID {driver_id[:8]} not found in users collection")
            else:
                print(f"   ❌ Failed to fetch users: {response.status_code}")
        else:
            print(f"\n4. No driver_id found in ride data")
        
        # 5. Check the raw data structure
        print(f"\n5. Raw ride data structure:")
        for key, value in target_ride.items():
            if key in ['driver_id', 'driver_name', 'rider_id', 'rider_name', 'status', 'id']:
                print(f"   {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ Debug failed with exception: {e}")
        return False

if __name__ == "__main__":
    debug_specific_ride()
