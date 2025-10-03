#!/usr/bin/env python3
"""
Test admin ride monitoring endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8001/api"

def create_admin_user():
    """Create an admin user for testing"""
    admin_data = {
        "email": "admin@test.com",
        "password": "adminpass123",
        "name": "Test Admin",
        "phone": "+1234567890",
        "role": "admin"
    }
    
    # Try to register
    response = requests.post(f"{BASE_URL}/auth/register", json=admin_data)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Admin registered: {data['user']['id']}")
        return data["access_token"]
    else:
        # Try to login if already exists
        login_data = {
            "email": admin_data["email"],
            "password": admin_data["password"]
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Admin logged in: {data['user']['id']}")
            return data["access_token"]
        else:
            print(f"❌ Failed to create admin: {response.status_code} - {response.text}")
            return None

def test_admin_endpoints(token):
    """Test admin ride endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔍 Testing admin ride endpoints...")
    
    # Test /api/admin/rides
    print("\n1. Testing /api/admin/rides:")
    response = requests.get(f"{BASE_URL}/admin/rides", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("✅ Admin rides endpoint working!")
        print(f"Pending requests: {data.get('total_pending', 0)}")
        print(f"Completed matches: {data.get('total_completed', 0)}")
        print(f"Total rides: {data.get('total_rides', 0)}")
    else:
        print(f"❌ Error: {response.text}")
    
    # Test /api/admin/rides/filtered
    print("\n2. Testing /api/admin/rides/filtered:")
    response = requests.get(f"{BASE_URL}/admin/rides/filtered", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("✅ Admin rides filtered endpoint working!")
        print(f"Response keys: {list(data.keys())}")
        if 'pending_requests' in data:
            print(f"Pending requests: {len(data['pending_requests'])}")
        if 'completed_matches' in data:
            print(f"Completed matches: {len(data['completed_matches'])}")
    else:
        print(f"❌ Error: {response.text}")
    
    # Test /api/admin/stats
    print("\n3. Testing /api/admin/stats:")
    response = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("✅ Admin stats endpoint working!")
        print(f"Total users: {data.get('total_users', 0)}")
        print(f"Total rides: {data.get('total_rides', 0)}")
        print(f"Total revenue: ${data.get('total_revenue', 0):.2f}")
    else:
        print(f"❌ Error: {response.text}")

def test_rider_endpoints():
    """Test what rider can see"""
    print("\n🚗 Testing rider endpoints...")
    
    # Get rider token
    login_data = {
        "email": "debug_rider@test.com",
        "password": "testpass123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        rider_token = data["access_token"]
        headers = {"Authorization": f"Bearer {rider_token}"}
        
        # Test /api/rides/my-requests
        print("\n1. Testing /api/rides/my-requests (rider):")
        response = requests.get(f"{BASE_URL}/rides/my-requests", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Rider my-requests endpoint working!")
            print(f"Pending requests: {data.get('total_pending', 0)}")
            print(f"Completed rides: {data.get('total_completed', 0)}")
        else:
            print(f"❌ Error: {response.text}")
        
        # Test /api/rides/unified
        print("\n2. Testing /api/rides/unified (rider):")
        response = requests.get(f"{BASE_URL}/rides/unified", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Rider unified endpoint working!")
            print(f"Role: {data.get('role')}")
            stats = data.get('statistics', {})
            print(f"Statistics: {stats}")
        else:
            print(f"❌ Error: {response.text}")

if __name__ == "__main__":
    print("🔍 TESTING ADMIN RIDE MONITORING")
    print("=" * 50)
    
    # Test admin endpoints
    admin_token = create_admin_user()
    if admin_token:
        test_admin_endpoints(admin_token)
    
    # Test rider endpoints
    test_rider_endpoints()
    
    print("\n" + "=" * 50)
    print("🎯 SUMMARY")
    print("=" * 50)
    print("1. Admin dashboard needs admin user token")
    print("2. Rider dashboard shows rider's own rides")
    print("3. Check which user role you're logged in as")
    print("4. Real-Time Ride Monitoring is admin-only feature")
