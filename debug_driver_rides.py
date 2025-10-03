#!/usr/bin/env python3
"""
Debug script to check driver ride availability issues
"""

import requests
import json
import sys

# Test the API endpoints directly
BASE_URL = "http://localhost:8001/api"

def test_endpoint(method, endpoint, data=None, headers=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        else:
            return None
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def create_test_users():
    """Create test users for debugging"""
    print("🔧 Creating test users...")
    
    users = {
        "rider": {
            "email": "debug_rider@test.com",
            "password": "testpass123",
            "name": "Debug Rider",
            "phone": "+1234567890",
            "role": "rider"
        },
        "driver": {
            "email": "debug_driver@test.com",
            "password": "testpass123",
            "name": "Debug Driver",
            "phone": "+1234567891",
            "role": "driver"
        }
    }
    
    tokens = {}
    user_ids = {}
    
    for role, user_data in users.items():
        # Try to register
        response = test_endpoint('POST', '/auth/register', user_data)
        if response and response.status_code == 200:
            data = response.json()
            tokens[role] = data["access_token"]
            user_ids[role] = data["user"]["id"]
            print(f"✅ {role.capitalize()} registered: {data['user']['id']}")
        else:
            # Try to login if registration fails
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            response = test_endpoint('POST', '/auth/login', login_data)
            if response and response.status_code == 200:
                data = response.json()
                tokens[role] = data["access_token"]
                user_ids[role] = data["user"]["id"]
                print(f"✅ {role.capitalize()} logged in: {data['user']['id']}")
            else:
                print(f"❌ Failed to setup {role}")
                return None, None
    
    return tokens, user_ids

def test_ride_request_creation(tokens):
    """Test creating a ride request"""
    print("\n🚗 Testing ride request creation...")
    
    ride_request = {
        "pickup_location": {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "address": "123 Test St, San Francisco, CA"
        },
        "dropoff_location": {
            "latitude": 37.7849,
            "longitude": -122.4094,
            "address": "456 Test Ave, San Francisco, CA"
        },
        "vehicle_type": "economy",
        "passenger_count": 2
    }
    
    headers = {"Authorization": f"Bearer {tokens['rider']}"}
    response = test_endpoint('POST', '/rides/request', ride_request, headers)
    
    if response and response.status_code == 200:
        data = response.json()
        print(f"✅ Ride request created: {data['request_id']}")
        return data['request_id']
    else:
        print(f"❌ Failed to create ride request: {response.status_code if response else 'No response'}")
        if response:
            print(f"   Error: {response.text}")
        return None

def test_driver_setup(tokens):
    """Test driver setup (location and online status)"""
    print("\n🚗 Testing driver setup...")
    
    headers = {"Authorization": f"Bearer {tokens['driver']}"}
    
    # Set driver location
    location_data = {
        "location": {
            "latitude": 37.7750,
            "longitude": -122.4195,
            "address": "Driver Location, San Francisco, CA"
        }
    }
    
    response = test_endpoint('POST', '/location/update', location_data, headers)
    if response and response.status_code == 200:
        print("✅ Driver location set")
    else:
        print(f"❌ Failed to set driver location: {response.status_code if response else 'No response'}")
    
    # Make driver online
    response = test_endpoint('POST', '/driver/online', headers=headers)
    if response and response.status_code == 200:
        print("✅ Driver set to online")
    else:
        print(f"❌ Failed to set driver online: {response.status_code if response else 'No response'}")

def test_available_rides_endpoint(tokens):
    """Test the available rides endpoint"""
    print("\n🔍 Testing available rides endpoint...")
    
    headers = {"Authorization": f"Bearer {tokens['driver']}"}
    print(f"Using token: {tokens['driver'][:20]}...")
    response = test_endpoint('GET', '/rides/available', headers=headers)
    
    if response:
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("✅ Available rides endpoint working!")
                print(f"Response data: {json.dumps(data, indent=2)}")
                
                # Check the structure
                if isinstance(data, dict):
                    available_count = data.get("total_available", 0)
                    pending_count = data.get("total_pending", 0)
                    print(f"📊 Available rides: {available_count}")
                    print(f"📊 Total pending requests: {pending_count}")
                elif isinstance(data, list):
                    print(f"📊 Available rides (list format): {len(data)}")
                
            except json.JSONDecodeError:
                print("❌ Invalid JSON response")
                print(f"Raw response: {response.text}")
        else:
            print(f"❌ Error response: {response.text}")
    else:
        print("❌ No response from server")

def test_unified_endpoint(tokens):
    """Test the unified endpoint"""
    print("\n🔄 Testing unified endpoint...")
    
    headers = {"Authorization": f"Bearer {tokens['driver']}"}
    response = test_endpoint('GET', '/rides/unified', headers=headers)
    
    if response and response.status_code == 200:
        try:
            data = response.json()
            print("✅ Unified endpoint working!")
            print(f"Role: {data.get('role', 'unknown')}")
            stats = data.get('statistics', {})
            print(f"Statistics: {stats}")
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
    else:
        print(f"❌ Unified endpoint failed: {response.status_code if response else 'No response'}")

def main():
    """Main debug function"""
    print("🐛 DEBUGGING DRIVER RIDE AVAILABILITY")
    print("=" * 50)
    
    # Test if server is running
    response = test_endpoint('GET', '/health')
    if not response or response.status_code != 200:
        print("❌ Server is not running or not accessible")
        print("Please start the server with: cd backend && python server.py")
        return
    
    print("✅ Server is running")
    
    # Create test users
    tokens, user_ids = create_test_users()
    if not tokens:
        print("❌ Failed to create test users")
        return
    
    # Create a ride request
    request_id = test_ride_request_creation(tokens)
    if not request_id:
        print("❌ Failed to create ride request")
        return
    
    # Setup driver
    test_driver_setup(tokens)
    
    # Test available rides endpoint
    test_available_rides_endpoint(tokens)
    
    # Test unified endpoint
    test_unified_endpoint(tokens)
    
    print("\n" + "=" * 50)
    print("🎯 DEBUG SUMMARY")
    print("=" * 50)
    print("1. Check if ride requests are being created")
    print("2. Check if driver location is set")
    print("3. Check if driver is online")
    print("4. Check if available rides endpoint returns data")
    print("5. Check frontend integration with new API response format")

if __name__ == "__main__":
    main()
