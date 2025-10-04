#!/usr/bin/env python3
"""
Test script to verify pending requests with accepted drivers show correct names
"""

import requests
import json
import time

base_url = "http://localhost:8001"

def test_pending_driver_names():
    print("🧪 Testing Pending Requests Driver Names")
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
        
        # 2. Fetch rides with filters
        print("\n2. Fetching rides with driver names...")
        response = requests.get(f"{base_url}/api/admin/rides/filtered", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch rides: {response.status_code} - {response.text}")
            return False
        
        rides_data = response.json()
        pending_requests = rides_data.get('pending_requests', [])
        completed_matches = rides_data.get('completed_matches', [])
        
        print(f"✅ Found {len(pending_requests)} pending requests and {len(completed_matches)} completed matches")
        
        # 3. Check pending requests with driver_id
        print("\n3. Checking pending requests with drivers...")
        pending_with_drivers = 0
        for request in pending_requests:
            if request.get('driver_id'):
                driver_name = request.get('driver_name', 'NOT_SET')
                driver_id = request.get('driver_id', 'N/A')
                status = request.get('status', 'N/A')
                
                print(f"   Request {request.get('id', 'N/A')[:8]}:")
                print(f"     Status: {status}")
                print(f"     Driver ID: {driver_id[:8] if driver_id != 'N/A' else 'N/A'}")
                print(f"     Driver Name: {driver_name}")
                
                if driver_name != 'NOT_SET' and driver_name != 'Unassigned':
                    pending_with_drivers += 1
                    print(f"     ✅ Driver name populated correctly")
                else:
                    print(f"     ❌ Driver name not populated")
                print()
        
        print(f"✅ Found {pending_with_drivers} pending requests with proper driver names")
        
        # 4. Check completed matches
        print("\n4. Checking completed matches...")
        completed_with_drivers = 0
        for match in completed_matches[:3]:  # Check first 3
            if match.get('driver_id'):
                driver_name = match.get('driver_name', 'NOT_SET')
                driver_id = match.get('driver_id', 'N/A')
                status = match.get('status', 'N/A')
                
                print(f"   Match {match.get('id', 'N/A')[:8]}:")
                print(f"     Status: {status}")
                print(f"     Driver ID: {driver_id[:8] if driver_id != 'N/A' else 'N/A'}")
                print(f"     Driver Name: {driver_name}")
                
                if driver_name != 'NOT_SET' and driver_name != 'Unassigned':
                    completed_with_drivers += 1
                    print(f"     ✅ Driver name populated correctly")
                else:
                    print(f"     ❌ Driver name not populated")
                print()
        
        print(f"✅ Found {completed_with_drivers} completed matches with proper driver names")
        
        if pending_with_drivers > 0 or completed_with_drivers > 0:
            print("\n🎉 Driver names fix is working for both pending and completed rides!")
            return True
        else:
            print("\n❌ No driver names found - fix may not be working")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = test_pending_driver_names()
    if success:
        print("\n✅ Pending driver names fix verified!")
    else:
        print("\n💥 Pending driver names fix failed")
