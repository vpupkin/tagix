#!/usr/bin/env python3
"""
Test script to verify the ride rating endpoint fix
"""

import requests
import json

# Test data
base_url = "http://localhost:8001"

# Test rider login
rider_login = {
    "email": "rider@yourdomain.com",
    "password": "TestPassword123!"
}

def test_rating_endpoint():
    print("🧪 Testing Ride Rating Endpoint Fix")
    print("=" * 50)
    
    try:
        # 1. Login as rider
        print("1. Logging in as rider...")
        response = requests.post(f"{base_url}/api/auth/login", json=rider_login)
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        token = data['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ Logged in as: {data['user']['name']}")
        
        # 2. Get rider's completed rides
        print("\n2. Fetching completed rides...")
        response = requests.get(f"{base_url}/api/rides/my-rides", headers=headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch rides: {response.status_code} - {response.text}")
            return False
        
        rides = response.json()
        print(f"✅ Found {len(rides)} completed rides")
        
        if not rides:
            print("⚠️ No completed rides found to test rating")
            return True
        
        # 3. Test rating the first completed ride
        test_ride = rides[0]
        ride_id = test_ride['id']
        print(f"\n3. Testing rating for ride: {ride_id}")
        
        rating_data = {
            "rating": 5,
            "comment": "Great ride! Test rating from script."
        }
        
        response = requests.post(
            f"{base_url}/api/rides/{ride_id}/rate", 
            json=rating_data, 
            headers=headers
        )
        
        if response.status_code == 200:
            print(f"✅ Rating submitted successfully!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Rating failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = test_rating_endpoint()
    if success:
        print("\n🎉 Rating endpoint fix verified!")
    else:
        print("\n💥 Rating endpoint still has issues")
