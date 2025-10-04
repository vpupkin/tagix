#!/usr/bin/env python3
"""
Debug script to understand why driver names are not being populated
"""

import requests
import json

base_url = "http://localhost:8001"

def debug_admin_names():
    print("🔍 Debugging Admin Driver Names")
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
        
        # 2. Get some users to see their IDs
        print("\n2. Fetching users...")
        response = requests.get(f"{base_url}/api/admin/users", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch users: {response.status_code}")
            return False
        
        users = response.json()
        print(f"✅ Found {len(users)} users")
        
        # Show first few users
        print("\n3. Sample users:")
        for i, user in enumerate(users[:5]):
            print(f"   User {i+1}: {user.get('name', 'N/A')} - ID: {user.get('id', 'N/A')[:8]}")
        
        # 4. Get rides and check driver IDs
        print("\n4. Fetching rides...")
        response = requests.get(f"{base_url}/api/admin/rides/filtered", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch rides: {response.status_code}")
            return False
        
        rides_data = response.json()
        completed_matches = rides_data.get('completed_matches', [])
        
        print(f"✅ Found {len(completed_matches)} completed matches")
        
        # 5. Check driver IDs in rides
        print("\n5. Driver IDs in rides:")
        driver_ids_in_rides = set()
        for match in completed_matches[:5]:
            driver_id = match.get('driver_id')
            if driver_id:
                driver_ids_in_rides.add(driver_id)
                print(f"   Ride {match.get('id', 'N/A')[:8]}: Driver ID {driver_id[:8]}")
        
        # 6. Check if these driver IDs exist in users
        print("\n6. Checking if driver IDs exist in users:")
        user_ids = {user.get('id') for user in users}
        
        for driver_id in driver_ids_in_rides:
            if driver_id in user_ids:
                # Find the user
                user = next((u for u in users if u.get('id') == driver_id), None)
                if user:
                    print(f"   ✅ Driver ID {driver_id[:8]} found: {user.get('name', 'N/A')}")
                else:
                    print(f"   ❌ Driver ID {driver_id[:8]} not found in users")
            else:
                print(f"   ❌ Driver ID {driver_id[:8]} not in user IDs")
        
        # 7. Test the actual API response
        print("\n7. Testing actual API response with names...")
        response = requests.get(f"{base_url}/api/admin/rides/filtered", headers=admin_headers)
        if response.status_code == 200:
            rides_data = response.json()
            completed_matches = rides_data.get('completed_matches', [])
            
            print("   First completed match details:")
            if completed_matches:
                match = completed_matches[0]
                print(f"     ID: {match.get('id', 'N/A')}")
                print(f"     Driver ID: {match.get('driver_id', 'N/A')}")
                print(f"     Driver Name: {match.get('driver_name', 'NOT_SET')}")
                print(f"     Rider ID: {match.get('rider_id', 'N/A')}")
                print(f"     Rider Name: {match.get('rider_name', 'NOT_SET')}")
                print(f"     Status: {match.get('status', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Debug failed with exception: {e}")
        return False

if __name__ == "__main__":
    debug_admin_names()
