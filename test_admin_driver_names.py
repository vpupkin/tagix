#!/usr/bin/env python3
"""
Test script to verify admin dashboard shows proper driver names
"""

import requests
import json
import time

base_url = "http://localhost:8001"

def test_admin_driver_names():
    print("🧪 Testing Admin Driver Names Fix")
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
        
        # 3. Check if driver names are populated
        print("\n3. Checking driver names in completed matches...")
        driver_names_found = 0
        for match in completed_matches[:5]:  # Check first 5 matches
            driver_name = match.get('driver_name', 'NOT_FOUND')
            driver_id = match.get('driver_id', 'N/A')
            rider_name = match.get('rider_name', 'NOT_FOUND')
            rider_id = match.get('rider_id', 'N/A')
            
            print(f"   Match {match.get('id', 'N/A')[:8]}:")
            print(f"     Driver: {driver_name} (ID: {driver_id[:8] if driver_id != 'N/A' else 'N/A'})")
            print(f"     Rider: {rider_name} (ID: {rider_id[:8] if rider_id != 'N/A' else 'N/A'})")
            print(f"     Status: {match.get('status', 'N/A')}")
            
            if driver_name != 'NOT_FOUND' and driver_name != 'Unassigned':
                driver_names_found += 1
        
        print(f"\n✅ Found {driver_names_found} matches with proper driver names")
        
        # 4. Check payments with driver names
        print("\n4. Checking payments with driver names...")
        response = requests.get(f"{base_url}/api/admin/payments/filtered", headers=admin_headers)
        if response.status_code == 200:
            payments_data = response.json()
            payments = payments_data.get('payments', [])
            print(f"✅ Found {len(payments)} payments")
            
            for payment in payments[:3]:  # Check first 3 payments
                driver_name = payment.get('driver_name', 'NOT_FOUND')
                rider_name = payment.get('rider_name', 'NOT_FOUND')
                amount = payment.get('amount', 0)
                
                print(f"   Payment {payment.get('id', 'N/A')[:8]}:")
                print(f"     Driver: {driver_name}")
                print(f"     Rider: {rider_name}")
                print(f"     Amount: ${amount}")
        else:
            print(f"❌ Failed to fetch payments: {response.status_code}")
        
        if driver_names_found > 0:
            print("\n🎉 Admin dashboard driver names fix is working!")
            return True
        else:
            print("\n❌ No driver names found - fix may not be working")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = test_admin_driver_names()
    if success:
        print("\n✅ Admin driver names fix verified!")
    else:
        print("\n💥 Admin driver names fix failed")
