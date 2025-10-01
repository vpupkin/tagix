#!/usr/bin/env python3

import requests
import json
import sys
import time
import asyncio
import websockets
import threading
from datetime import datetime
import uuid
from concurrent.futures import ThreadPoolExecutor

class DriverNotificationTester:
    def __init__(self, base_url="https://ridesync-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.websocket_messages = []
        self.websocket_connected = False
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            print(f"✅ {test_name}: PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {test_name}: FAILED")
            if error:
                print(f"   Error: {error}")
            if details:
                print(f"   Details: {details}")
        
        self.test_results.append({
            "test_name": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        })
        print()

    def make_request(self, method, endpoint, data=None, headers=None, auth_token=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        if auth_token:
            request_headers['Authorization'] = f'Bearer {auth_token}'
            
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=request_headers, timeout=30)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def register_user(self, role="driver", suffix=""):
        """Register a new user"""
        timestamp = int(time.time())
        user_data = {
            "email": f"test_{role}_{timestamp}{suffix}@example.com",
            "password": "TestPassword123!",
            "name": f"Test {role.title()} {timestamp}{suffix}",
            "phone": f"+1555{timestamp % 10000:04d}",
            "role": role
        }
        
        response = self.make_request('POST', '/api/auth/register', user_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    key = f"{role}{suffix}"
                    self.tokens[key] = data['access_token']
                    self.users[key] = data['user']
                    self.log_test(f"User Registration ({key})", True, 
                                f"User ID: {data['user']['id']}, Email: {data['user']['email']}")
                    return True
                else:
                    self.log_test(f"User Registration ({role}{suffix})", False, error="Missing token or user data")
                    return False
            except json.JSONDecodeError:
                self.log_test(f"User Registration ({role}{suffix})", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"User Registration ({role}{suffix})", False, error=f"HTTP {status}")
            return False

    def create_driver_profile(self, driver_key="driver"):
        """Create driver profile"""
        token = self.tokens.get(driver_key)
        if not token:
            self.log_test(f"Driver Profile Creation ({driver_key})", False, error="No driver token available")
            return False
            
        profile_data = {
            "vehicle_type": "economy",
            "vehicle_make": "Toyota",
            "vehicle_model": "Camry",
            "vehicle_year": 2020,
            "license_plate": f"ABC{driver_key[-1] if driver_key[-1].isdigit() else '1'}23",
            "license_number": f"DL12345678{driver_key[-1] if driver_key[-1].isdigit() else '1'}"
        }
        
        response = self.make_request('POST', '/api/driver/profile', profile_data, auth_token=token)
        
        if response and response.status_code == 200:
            self.log_test(f"Driver Profile Creation ({driver_key})", True, "Profile created successfully")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"Driver Profile Creation ({driver_key})", False, error=f"HTTP {status}")
            return False

    def update_driver_location(self, driver_key="driver", lat=37.7749, lng=-122.4194):
        """Update driver location"""
        token = self.tokens.get(driver_key)
        if not token:
            self.log_test(f"Driver Location Update ({driver_key})", False, error="No driver token available")
            return False
        
        # Get user_id from stored user data
        user = self.users.get(driver_key)
        if not user:
            self.log_test(f"Driver Location Update ({driver_key})", False, error="No user data available")
            return False
            
        location_data = {
            "user_id": user['id'],
            "location": {
                "latitude": lat,
                "longitude": lng,
                "address": f"Test Location for {driver_key}, San Francisco, CA"
            }
        }
        
        response = self.make_request('POST', '/api/location/update', location_data, auth_token=token)
        
        if response and response.status_code == 200:
            self.log_test(f"Driver Location Update ({driver_key})", True, f"Location set to {lat}, {lng}")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"Driver Location Update ({driver_key})", False, error=f"HTTP {status}")
            return False

    def toggle_driver_online(self, driver_key="driver"):
        """Toggle driver online status"""
        token = self.tokens.get(driver_key)
        if not token:
            self.log_test(f"Driver Online Toggle ({driver_key})", False, error="No driver token available")
            return False
            
        response = self.make_request('POST', '/api/driver/online', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                self.log_test(f"Driver Online Toggle ({driver_key})", True, data.get('message', 'Status toggled'))
                return True
            except json.JSONDecodeError:
                self.log_test(f"Driver Online Toggle ({driver_key})", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"Driver Online Toggle ({driver_key})", False, error=f"HTTP {status}")
            return False

    def check_driver_online_status(self, driver_key="driver"):
        """Check if driver is online and toggle if needed"""
        token = self.tokens.get('admin')
        user = self.users.get(driver_key)
        
        if not token or not user:
            self.log_test(f"Driver Online Status Check ({driver_key})", False, error="Missing admin token or user data")
            return False
        
        # Get driver info from admin endpoint
        response = self.make_request('GET', f'/api/admin/users/filtered?search={user["email"]}', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                users = data.get('users', [])
                if users:
                    driver_data = users[0]
                    is_online = driver_data.get('is_online', False)
                    
                    if is_online:
                        self.log_test(f"Driver Online Status Check ({driver_key})", True, f"Driver is already online")
                        return True
                    else:
                        # Driver is offline, toggle to online
                        self.log_test(f"Driver Online Status Check ({driver_key})", True, f"Driver was offline, toggling to online")
                        return self.toggle_driver_online(driver_key)
                else:
                    self.log_test(f"Driver Online Status Check ({driver_key})", False, error="Driver not found")
                    return False
            except json.JSONDecodeError:
                self.log_test(f"Driver Online Status Check ({driver_key})", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"Driver Online Status Check ({driver_key})", False, error=f"HTTP {status}")
            return False

    def check_online_drivers(self):
        """Check how many drivers are online using admin stats"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Check Online Drivers", False, error="No admin token available")
            return False
            
        response = self.make_request('GET', '/api/admin/stats', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                online_drivers = data.get('online_drivers', 0)
                total_drivers = data.get('total_drivers', 0)
                self.log_test("Check Online Drivers", True, 
                            f"Online drivers: {online_drivers}/{total_drivers}")
                return online_drivers > 0
            except json.JSONDecodeError:
                self.log_test("Check Online Drivers", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Check Online Drivers", False, error=f"HTTP {status}")
            return False

    def query_drivers_directly(self):
        """Query drivers directly from database using admin endpoint"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Query Drivers Directly", False, error="No admin token available")
            return False
            
        response = self.make_request('GET', '/api/admin/users/filtered?role=driver', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                drivers = data.get('users', [])
                online_drivers = [d for d in drivers if d.get('is_online', False)]
                drivers_with_location = [d for d in drivers if d.get('current_location')]
                
                self.log_test("Query Drivers Directly", True, 
                            f"Total drivers: {len(drivers)}, Online: {len(online_drivers)}, With location: {len(drivers_with_location)}")
                
                # Print detailed driver info
                for i, driver in enumerate(drivers[:3]):  # Show first 3 drivers
                    print(f"   Driver {i+1}: {driver.get('name')} - Online: {driver.get('is_online', False)} - Location: {'Yes' if driver.get('current_location') else 'No'}")
                
                return len(online_drivers) > 0 and len(drivers_with_location) > 0
            except json.JSONDecodeError:
                self.log_test("Query Drivers Directly", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Query Drivers Directly", False, error=f"HTTP {status}")
            return False

    async def websocket_listener(self, driver_id, duration=10):
        """Listen for WebSocket messages for a driver"""
        ws_url = f"wss://ridesync-10.preview.emergentagent.com/ws/{driver_id}"
        
        try:
            async with websockets.connect(ws_url) as websocket:
                self.websocket_connected = True
                print(f"   WebSocket connected for driver {driver_id}")
                
                # Listen for messages for specified duration
                start_time = time.time()
                while time.time() - start_time < duration:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        self.websocket_messages.append({
                            "driver_id": driver_id,
                            "message": message,
                            "timestamp": datetime.now().isoformat()
                        })
                        print(f"   📨 WebSocket message received for {driver_id}: {message}")
                    except asyncio.TimeoutError:
                        continue
                    except websockets.exceptions.ConnectionClosed:
                        print(f"   WebSocket connection closed for {driver_id}")
                        break
                        
        except Exception as e:
            print(f"   WebSocket connection failed for {driver_id}: {e}")
            self.websocket_connected = False

    def test_websocket_connection(self, driver_key="driver"):
        """Test WebSocket connection for a driver"""
        driver = self.users.get(driver_key)
        if not driver:
            self.log_test(f"WebSocket Connection Test ({driver_key})", False, error="No driver user data available")
            return False
        
        driver_id = driver['id']
        
        try:
            # Run WebSocket listener in async context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Test connection for 5 seconds
            loop.run_until_complete(self.websocket_listener(driver_id, duration=5))
            loop.close()
            
            if self.websocket_connected:
                self.log_test(f"WebSocket Connection Test ({driver_key})", True, f"Connected successfully for driver {driver_id}")
                return True
            else:
                self.log_test(f"WebSocket Connection Test ({driver_key})", False, error="Failed to establish WebSocket connection")
                return False
                
        except Exception as e:
            self.log_test(f"WebSocket Connection Test ({driver_key})", False, error=f"WebSocket test failed: {e}")
            return False

    def create_ride_request_and_test_notifications(self):
        """Create a ride request and test if drivers receive notifications"""
        rider_token = self.tokens.get('rider')
        if not rider_token:
            self.log_test("Ride Request with Notifications", False, error="No rider token available")
            return False
        
        # Clear previous WebSocket messages
        self.websocket_messages = []
        
        # Start WebSocket listeners for all drivers in background
        driver_keys = [key for key in self.users.keys() if key.startswith('driver')]
        websocket_threads = []
        
        for driver_key in driver_keys:
            driver = self.users.get(driver_key)
            if driver:
                driver_id = driver['id']
                
                def start_websocket_listener(did):
                    try:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(self.websocket_listener(did, duration=15))
                        loop.close()
                    except Exception as e:
                        print(f"   WebSocket listener error for {did}: {e}")
                
                thread = threading.Thread(target=start_websocket_listener, args=(driver_id,))
                thread.daemon = True
                thread.start()
                websocket_threads.append(thread)
        
        # Wait a moment for WebSocket connections to establish
        time.sleep(2)
        
        # Create ride request
        ride_data = {
            "pickup_location": {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "address": "San Francisco, CA"
            },
            "dropoff_location": {
                "latitude": 37.7849,
                "longitude": -122.4094,
                "address": "Downtown San Francisco, CA"
            },
            "vehicle_type": "economy",
            "passenger_count": 1,
            "special_requirements": "Test ride request for driver notifications"
        }
        
        print("   Creating ride request...")
        response = self.make_request('POST', '/api/rides/request', ride_data, auth_token=rider_token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                request_id = data.get('request_id')
                matches_found = data.get('matches_found', 0)
                
                print(f"   Ride request created: {request_id}")
                print(f"   Matches found: {matches_found}")
                
                # Wait for WebSocket messages
                print("   Waiting for WebSocket notifications...")
                time.sleep(8)
                
                # Check if any WebSocket messages were received
                ride_notifications = [msg for msg in self.websocket_messages 
                                    if 'ride_request' in msg.get('message', '')]
                
                success = len(ride_notifications) > 0
                details = f"Request ID: {request_id}, Matches: {matches_found}, Notifications received: {len(ride_notifications)}"
                
                if success:
                    self.log_test("Ride Request with Notifications", True, details)
                    for notification in ride_notifications:
                        print(f"   📨 Notification to {notification['driver_id']}: {notification['message']}")
                else:
                    error = f"No ride request notifications received. Matches found: {matches_found}"
                    self.log_test("Ride Request with Notifications", False, details, error)
                
                return success
                
            except json.JSONDecodeError:
                self.log_test("Ride Request with Notifications", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Request with Notifications", False, error=f"HTTP {status}")
            return False

    def test_find_nearby_drivers_function(self):
        """Test the find_nearby_drivers function by checking ride request response"""
        rider_token = self.tokens.get('rider')
        if not rider_token:
            self.log_test("Find Nearby Drivers Function", False, error="No rider token available")
            return False
        
        ride_data = {
            "pickup_location": {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "address": "San Francisco, CA"
            },
            "dropoff_location": {
                "latitude": 37.7849,
                "longitude": -122.4094,
                "address": "Downtown San Francisco, CA"
            },
            "vehicle_type": "economy",
            "passenger_count": 1
        }
        
        response = self.make_request('POST', '/api/rides/request', ride_data, auth_token=rider_token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                matches_found = data.get('matches_found', 0)
                
                if matches_found > 0:
                    self.log_test("Find Nearby Drivers Function", True, 
                                f"Found {matches_found} nearby drivers")
                    return True
                else:
                    self.log_test("Find Nearby Drivers Function", False, 
                                error="No nearby drivers found", 
                                details="This could indicate issues with driver location data or online status")
                    return False
                    
            except json.JSONDecodeError:
                self.log_test("Find Nearby Drivers Function", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Find Nearby Drivers Function", False, error=f"HTTP {status}")
            return False

    def run_driver_notification_debug_test(self):
        """Run comprehensive driver notification debugging test"""
        print("🚗 Starting Driver Notification Debug Test")
        print("=" * 60)
        
        # Step 1: Setup users
        print("\n👥 STEP 1: USER SETUP")
        print("-" * 30)
        self.register_user("admin")
        self.register_user("rider")
        self.register_user("driver", "1")
        self.register_user("driver", "2")
        
        # Step 2: Setup driver profiles
        print("\n🚗 STEP 2: DRIVER PROFILE SETUP")
        print("-" * 30)
        self.create_driver_profile("driver1")
        self.create_driver_profile("driver2")
        
        # Step 3: Set driver locations
        print("\n📍 STEP 3: DRIVER LOCATION SETUP")
        print("-" * 30)
        self.update_driver_location("driver1", 37.7749, -122.4194)  # San Francisco
        self.update_driver_location("driver2", 37.7849, -122.4094)  # Nearby location
        
        # Step 4: Ensure drivers are online
        print("\n🟢 STEP 4: DRIVER ONLINE STATUS")
        print("-" * 30)
        # The location update already sets is_online to True, but let's verify
        self.check_driver_online_status("driver1")
        self.check_driver_online_status("driver2")
        
        # Step 5: Verify driver setup
        print("\n🔍 STEP 5: DRIVER SETUP VERIFICATION")
        print("-" * 30)
        self.check_online_drivers()
        self.query_drivers_directly()
        
        # Step 6: Test WebSocket connections
        print("\n🔌 STEP 6: WEBSOCKET CONNECTION TESTS")
        print("-" * 30)
        self.test_websocket_connection("driver1")
        self.test_websocket_connection("driver2")
        
        # Step 7: Test find nearby drivers function
        print("\n🎯 STEP 7: NEARBY DRIVERS FUNCTION TEST")
        print("-" * 30)
        self.test_find_nearby_drivers_function()
        
        # Step 8: Test full notification flow
        print("\n📨 STEP 8: FULL NOTIFICATION FLOW TEST")
        print("-" * 30)
        self.create_ride_request_and_test_notifications()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 DRIVER NOTIFICATION DEBUG TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        # Detailed analysis
        print("\n🔍 DETAILED ANALYSIS")
        print("-" * 30)
        
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("❌ Failed Tests:")
            for test in failed_tests:
                print(f"   • {test['test_name']}: {test['error']}")
        
        websocket_notifications = len([msg for msg in self.websocket_messages 
                                     if 'ride_request' in msg.get('message', '')])
        print(f"\n📨 WebSocket Notifications Received: {websocket_notifications}")
        
        if websocket_notifications == 0:
            print("\n🚨 CRITICAL ISSUE IDENTIFIED:")
            print("   Drivers are not receiving ride request notifications via WebSocket")
            print("   Possible causes:")
            print("   1. WebSocket connection issues")
            print("   2. find_nearby_drivers function not finding drivers")
            print("   3. WebSocket message sending logic not working")
            print("   4. Driver online status or location data issues")
        
        return self.passed_tests == self.total_tests

def main():
    """Main test execution"""
    tester = DriverNotificationTester()
    success = tester.run_driver_notification_debug_test()
    
    # Save detailed results
    with open('/app/driver_notification_test_results.json', 'w') as f:
        json.dump({
            'test_type': 'driver_notification_debug',
            'summary': {
                'total_tests': tester.total_tests,
                'passed_tests': tester.passed_tests,
                'failed_tests': tester.total_tests - tester.passed_tests,
                'success_rate': (tester.passed_tests/tester.total_tests*100) if tester.total_tests > 0 else 0,
                'websocket_messages_received': len(tester.websocket_messages),
                'ride_notifications_received': len([msg for msg in tester.websocket_messages 
                                                  if 'ride_request' in msg.get('message', '')]),
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results,
            'websocket_messages': tester.websocket_messages
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())