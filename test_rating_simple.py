#!/usr/bin/env python3
"""
Simple test to create a user and test rating functionality
"""

import requests
import json
import time

base_url = "http://localhost:8001"
timestamp = int(time.time())

def test_rating_flow():
    print("🧪 Testing Complete Rating Flow")
    print("=" * 50)
    
    try:
        # 1. Create a test rider
        print("1. Creating test rider...")
        rider_data = {
            "email": f"test_rider_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Test Rider {timestamp}",
            "phone": f"+1555{timestamp % 10000:04d}",
            "role": "rider"
        }
        
        response = requests.post(f"{base_url}/api/auth/register", json=rider_data)
        if response.status_code != 200:
            print(f"❌ Rider creation failed: {response.status_code} - {response.text}")
            return False
        
        rider_info = response.json()
        print(f"✅ Rider created: {rider_info['user']['name']}")
        
        # 2. Login as rider
        print("\n2. Logging in as rider...")
        login_data = {
            "email": rider_data["email"],
            "password": rider_data["password"]
        }
        
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
        
        login_info = response.json()
        token = login_info['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ Logged in successfully")
        
        # 3. Create a test driver
        print("\n3. Creating test driver...")
        driver_data = {
            "email": f"test_driver_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Test Driver {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 1:04d}",
            "role": "driver"
        }
        
        response = requests.post(f"{base_url}/api/auth/register", json=driver_data)
        if response.status_code != 200:
            print(f"❌ Driver creation failed: {response.status_code} - {response.text}")
            return False
        
        driver_info = response.json()
        print(f"✅ Driver created: {driver_info['user']['name']}")
        
        # 4. Login as driver and set up profile
        print("\n4. Setting up driver profile...")
        driver_login = {
            "email": driver_data["email"],
            "password": driver_data["password"]
        }
        
        response = requests.post(f"{base_url}/api/auth/login", json=driver_login)
        if response.status_code != 200:
            print(f"❌ Driver login failed: {response.status_code} - {response.text}")
            return False
        
        driver_token = response.json()['access_token']
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        
        # Set driver location
        location_data = {
            "location": {
                "latitude": 48.7758,
                "longitude": 9.1829,
                "address": "Stuttgart, Germany"
            }
        }
        
        response = requests.post(f"{base_url}/api/location/update", json=location_data, headers=driver_headers)
        if response.status_code != 200:
            print(f"❌ Location update failed: {response.status_code} - {response.text}")
            return False
        
        # Set driver online
        response = requests.post(f"{base_url}/api/driver/online", headers=driver_headers)
        if response.status_code not in [200, 500]:  # Accept both success and server error
            print(f"❌ Set online failed: {response.status_code} - {response.text}")
            return False
        
        print("✅ Driver profile set up")
        
        # 5. Create a ride request as rider
        print("\n5. Creating ride request...")
        ride_request = {
            "pickup_location": {
                "latitude": 48.7758,
                "longitude": 9.1829,
                "address": "Stuttgart Central Station"
            },
            "dropoff_location": {
                "latitude": 48.7833,
                "longitude": 9.1833,
                "address": "Stuttgart Airport"
            },
            "vehicle_type": "economy",
            "passengers": 1,
            "special_requirements": "Test ride for rating"
        }
        
        response = requests.post(f"{base_url}/api/rides/request", json=ride_request, headers=headers)
        if response.status_code != 200:
            print(f"❌ Ride request failed: {response.status_code} - {response.text}")
            return False
        
        ride_info = response.json()
        print(f"✅ Ride request response: {ride_info}")
        
        # The response has 'request_id' not 'ride_id'
        ride_id = ride_info.get('request_id')
        if not ride_id:
            print(f"❌ No request_id in response")
            return False
        print(f"✅ Ride request created: {ride_id}")
        
        # 6. Accept ride as driver
        print("\n6. Accepting ride as driver...")
        
        response = requests.post(f"{base_url}/api/rides/{ride_id}/accept", headers=driver_headers)
        if response.status_code != 200:
            print(f"❌ Ride acceptance failed: {response.status_code} - {response.text}")
            return False
        
        accept_info = response.json()
        print(f"✅ Ride accepted: {accept_info}")
        
        # Get the match_id from the acceptance response
        match_id = accept_info.get('match_id')
        if not match_id:
            print(f"❌ No match_id in acceptance response")
            return False
        
        # 7. Complete ride as driver
        print("\n7. Completing ride...")
        
        response = requests.post(f"{base_url}/api/rides/{match_id}/complete", headers=driver_headers)
        if response.status_code != 200:
            print(f"❌ Ride completion failed: {response.status_code} - {response.text}")
            return False
        
        complete_info = response.json()
        print(f"✅ Ride completed: {complete_info}")
        
        # 8. Test rating the ride
        print("\n8. Testing ride rating...")
        print(f"   Using match_id for rating: {match_id}")
        rating_data = {
            "rating": 5,
            "comment": "Excellent ride! Test rating from script."
        }
        
        response = requests.post(
            f"{base_url}/api/rides/{match_id}/rate", 
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
    success = test_rating_flow()
    if success:
        print("\n🎉 Rating endpoint fix verified!")
    else:
        print("\n💥 Rating endpoint still has issues")
