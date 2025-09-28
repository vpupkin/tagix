#!/usr/bin/env python3

import requests
import json
import sys
import time
from datetime import datetime
import uuid

class MobilityHubAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
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
        
        # Set up headers
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
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def test_health_check(self):
        """Test basic health check endpoint"""
        response = self.make_request('GET', '/api/health')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_test("Health Check", True, f"Service: {data.get('service', 'Unknown')}")
                    return True
                else:
                    self.log_test("Health Check", False, error="Unexpected response format")
                    return False
            except json.JSONDecodeError:
                self.log_test("Health Check", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Health Check", False, error=f"HTTP {status}")
            return False

    def test_config_endpoint(self):
        """Test configuration endpoint"""
        response = self.make_request('GET', '/api/config')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                features = data.get('features', {})
                self.log_test("Config Endpoint", True, 
                            f"Google Maps Key: {data.get('google_maps_api_key', 'Not set')[:20]}..., "
                            f"Features: {list(features.keys())}")
                return True
            except json.JSONDecodeError:
                self.log_test("Config Endpoint", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Config Endpoint", False, error=f"HTTP {status}")
            return False

    def test_user_registration(self, role="rider"):
        """Test user registration"""
        timestamp = int(time.time())
        user_data = {
            "email": f"test_{role}_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Test {role.title()} {timestamp}",
            "phone": f"+1555{timestamp % 10000:04d}",
            "role": role
        }
        
        response = self.make_request('POST', '/api/auth/register', user_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.tokens[role] = data['access_token']
                    self.users[role] = data['user']
                    self.log_test(f"User Registration ({role})", True, 
                                f"User ID: {data['user']['id']}, Email: {data['user']['email']}")
                    return True
                else:
                    self.log_test(f"User Registration ({role})", False, error="Missing token or user data")
                    return False
            except json.JSONDecodeError:
                self.log_test(f"User Registration ({role})", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            error_msg = ""
            if response:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', 'Unknown error')
                except:
                    error_msg = response.text[:100]
            self.log_test(f"User Registration ({role})", False, error=f"HTTP {status}: {error_msg}")
            return False

    def test_user_login(self, role="rider"):
        """Test user login"""
        if role not in self.users:
            self.log_test(f"User Login ({role})", False, error="User not registered yet")
            return False
            
        user = self.users[role]
        login_data = {
            "email": user['email'],
            "password": "TestPassword123!"
        }
        
        response = self.make_request('POST', '/api/auth/login', login_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data:
                    self.tokens[f"{role}_login"] = data['access_token']
                    self.log_test(f"User Login ({role})", True, f"Token received for {user['email']}")
                    return True
                else:
                    self.log_test(f"User Login ({role})", False, error="No access token in response")
                    return False
            except json.JSONDecodeError:
                self.log_test(f"User Login ({role})", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"User Login ({role})", False, error=f"HTTP {status}")
            return False

    def test_auth_me(self, role="rider"):
        """Test getting current user info"""
        token = self.tokens.get(role)
        if not token:
            self.log_test(f"Auth Me ({role})", False, error="No auth token available")
            return False
            
        response = self.make_request('GET', '/api/auth/me', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'id' in data and 'email' in data:
                    self.log_test(f"Auth Me ({role})", True, f"User: {data['name']} ({data['role']})")
                    return True
                else:
                    self.log_test(f"Auth Me ({role})", False, error="Missing user data")
                    return False
            except json.JSONDecodeError:
                self.log_test(f"Auth Me ({role})", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"Auth Me ({role})", False, error=f"HTTP {status}")
            return False

    def test_driver_profile_creation(self):
        """Test driver profile creation"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Profile Creation", False, error="No driver token available")
            return False
            
        profile_data = {
            "vehicle_type": "economy",
            "vehicle_make": "Toyota",
            "vehicle_model": "Camry",
            "vehicle_year": 2020,
            "license_plate": "ABC123",
            "license_number": "DL123456789"
        }
        
        response = self.make_request('POST', '/api/driver/profile', profile_data, auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data:
                    self.log_test("Driver Profile Creation", True, data['message'])
                    return True
                else:
                    self.log_test("Driver Profile Creation", False, error="Unexpected response format")
                    return False
            except json.JSONDecodeError:
                self.log_test("Driver Profile Creation", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Profile Creation", False, error=f"HTTP {status}")
            return False

    def test_driver_profile_retrieval(self):
        """Test driver profile retrieval"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Profile Retrieval", False, error="No driver token available")
            return False
            
        response = self.make_request('GET', '/api/driver/profile', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'vehicle_make' in data and 'vehicle_model' in data:
                    self.log_test("Driver Profile Retrieval", True, 
                                f"Vehicle: {data['vehicle_year']} {data['vehicle_make']} {data['vehicle_model']}")
                    return True
                else:
                    self.log_test("Driver Profile Retrieval", False, error="Missing vehicle data")
                    return False
            except json.JSONDecodeError:
                self.log_test("Driver Profile Retrieval", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Profile Retrieval", False, error=f"HTTP {status}")
            return False

    def test_ride_request_creation(self):
        """Test ride request creation"""
        token = self.tokens.get('rider')
        if not token:
            self.log_test("Ride Request Creation", False, error="No rider token available")
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
            "passenger_count": 1,
            "special_requirements": "Test ride request"
        }
        
        response = self.make_request('POST', '/api/rides/request', ride_data, auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'request_id' in data and 'estimated_fare' in data:
                    self.users['ride_request_id'] = data['request_id']
                    self.log_test("Ride Request Creation", True, 
                                f"Request ID: {data['request_id']}, Fare: ${data['estimated_fare']:.2f}")
                    return True
                else:
                    self.log_test("Ride Request Creation", False, error="Missing request data")
                    return False
            except json.JSONDecodeError:
                self.log_test("Ride Request Creation", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Request Creation", False, error=f"HTTP {status}")
            return False

    def test_ride_acceptance(self):
        """Test ride request acceptance by driver"""
        token = self.tokens.get('driver')
        request_id = self.users.get('ride_request_id')
        
        if not token:
            self.log_test("Ride Acceptance", False, error="No driver token available")
            return False
        if not request_id:
            self.log_test("Ride Acceptance", False, error="No ride request ID available")
            return False
            
        response = self.make_request('POST', f'/api/rides/{request_id}/accept', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'match_id' in data:
                    self.users['match_id'] = data['match_id']
                    self.log_test("Ride Acceptance", True, f"Match ID: {data['match_id']}")
                    return True
                else:
                    self.log_test("Ride Acceptance", False, error="Missing match ID")
                    return False
            except json.JSONDecodeError:
                self.log_test("Ride Acceptance", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Acceptance", False, error=f"HTTP {status}")
            return False

    def test_my_rides(self, role="rider"):
        """Test getting user's rides"""
        token = self.tokens.get(role)
        if not token:
            self.log_test(f"My Rides ({role})", False, error=f"No {role} token available")
            return False
            
        response = self.make_request('GET', '/api/rides/my-rides', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(f"My Rides ({role})", True, f"Found {len(data)} rides")
                    return True
                else:
                    self.log_test(f"My Rides ({role})", False, error="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test(f"My Rides ({role})", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"My Rides ({role})", False, error=f"HTTP {status}")
            return False

    def test_location_update(self, role="driver"):
        """Test location update"""
        token = self.tokens.get(role)
        if not token:
            self.log_test(f"Location Update ({role})", False, error=f"No {role} token available")
            return False
            
        location_data = {
            "location": {
                "latitude": 37.7849,
                "longitude": -122.4094,
                "address": "Updated Location, San Francisco, CA"
            }
        }
        
        response = self.make_request('POST', '/api/location/update', location_data, auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data:
                    self.log_test(f"Location Update ({role})", True, data['message'])
                    return True
                else:
                    self.log_test(f"Location Update ({role})", False, error="Unexpected response format")
                    return False
            except json.JSONDecodeError:
                self.log_test(f"Location Update ({role})", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test(f"Location Update ({role})", False, error=f"HTTP {status}")
            return False

    def test_driver_online_toggle(self):
        """Test driver online status toggle"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Online Toggle", False, error="No driver token available")
            return False
            
        response = self.make_request('POST', '/api/driver/online', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data:
                    self.log_test("Driver Online Toggle", True, data['message'])
                    return True
                else:
                    self.log_test("Driver Online Toggle", False, error="Unexpected response format")
                    return False
            except json.JSONDecodeError:
                self.log_test("Driver Online Toggle", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Online Toggle", False, error=f"HTTP {status}")
            return False

    def test_admin_stats(self):
        """Test admin statistics endpoint"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Stats", False, error="No admin token available")
            return False
            
        response = self.make_request('GET', '/api/admin/stats', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                expected_keys = ['total_users', 'total_drivers', 'total_riders', 'total_rides']
                if all(key in data for key in expected_keys):
                    self.log_test("Admin Stats", True, 
                                f"Users: {data['total_users']}, Rides: {data['total_rides']}, Revenue: ${data.get('total_revenue', 0):.2f}")
                    return True
                else:
                    self.log_test("Admin Stats", False, error="Missing expected statistics")
                    return False
            except json.JSONDecodeError:
                self.log_test("Admin Stats", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Stats", False, error=f"HTTP {status}")
            return False

    def test_admin_users(self):
        """Test admin users endpoint"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Users", False, error="No admin token available")
            return False
            
        response = self.make_request('GET', '/api/admin/users', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Admin Users", True, f"Found {len(data)} users")
                    return True
                else:
                    self.log_test("Admin Users", False, error="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("Admin Users", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Users", False, error=f"HTTP {status}")
            return False

    def test_admin_rides(self):
        """Test admin rides endpoint"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Rides", False, error="No admin token available")
            return False
            
        response = self.make_request('GET', '/api/admin/rides', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Admin Rides", True, f"Found {len(data)} rides")
                    return True
                else:
                    self.log_test("Admin Rides", False, error="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("Admin Rides", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Rides", False, error=f"HTTP {status}")
            return False

    def test_admin_users_filtered(self):
        """Test admin users filtered endpoint - specifically for ObjectId serialization fix"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Users Filtered", False, error="No admin token available")
            return False
            
        response = self.make_request('GET', '/api/admin/users/filtered', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict) and 'users' in data:
                    self.log_test("Admin Users Filtered", True, 
                                f"Found {len(data['users'])} users, Total: {data.get('total', 0)}")
                    return True
                else:
                    self.log_test("Admin Users Filtered", False, error="Unexpected response format")
                    return False
            except json.JSONDecodeError:
                self.log_test("Admin Users Filtered", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            error_msg = ""
            if response:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', 'Unknown error')
                except:
                    error_msg = response.text[:200]
            self.log_test("Admin Users Filtered", False, error=f"HTTP {status}: {error_msg}")
            return False

    def test_audit_logs(self):
        """Test audit logs endpoint - specifically for ObjectId serialization fix"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Audit Logs", False, error="No admin token available")
            return False
            
        response = self.make_request('GET', '/api/audit/logs', auth_token=token)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Audit Logs", True, f"Found {len(data)} audit log entries")
                    return True
                else:
                    self.log_test("Audit Logs", False, error="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("Audit Logs", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            error_msg = ""
            if response:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', 'Unknown error')
                except:
                    error_msg = response.text[:200]
            self.log_test("Audit Logs", False, error=f"HTTP {status}: {error_msg}")
            return False

    def run_objectid_serialization_test(self):
        """Run specific test for MongoDB ObjectId serialization fix"""
        print("🔧 Starting MongoDB ObjectId Serialization Fix Test")
        print("=" * 60)
        
        # First ensure we have an admin user
        print("\n🔐 ADMIN AUTHENTICATION")
        print("-" * 30)
        self.test_user_registration("admin")
        self.test_user_login("admin")
        self.test_auth_me("admin")
        
        # Test the specific endpoints that were failing
        print("\n🛠️ OBJECTID SERIALIZATION TESTS")
        print("-" * 30)
        self.test_admin_users_filtered()
        self.test_admin_users()
        self.test_admin_rides()
        self.test_audit_logs()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 OBJECTID SERIALIZATION TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 ALL OBJECTID SERIALIZATION TESTS PASSED!")
            print("✅ MongoDB ObjectId serialization fix is working correctly.")
            return True
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} tests failed.")
            print("❌ MongoDB ObjectId serialization issues may still exist.")
            return False

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting MobilityHub API Comprehensive Testing")
        print("=" * 60)
        
        # Basic connectivity tests
        print("\n📡 CONNECTIVITY TESTS")
        print("-" * 30)
        self.test_health_check()
        self.test_config_endpoint()
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        self.test_user_registration("rider")
        self.test_user_registration("driver") 
        self.test_user_registration("admin")
        
        self.test_user_login("rider")
        self.test_user_login("driver")
        self.test_user_login("admin")
        
        self.test_auth_me("rider")
        self.test_auth_me("driver")
        self.test_auth_me("admin")
        
        # Driver-specific tests
        print("\n🚗 DRIVER FUNCTIONALITY TESTS")
        print("-" * 30)
        self.test_driver_profile_creation()
        self.test_driver_profile_retrieval()
        self.test_location_update("driver")
        self.test_driver_online_toggle()
        
        # Ride system tests
        print("\n🛣️ RIDE SYSTEM TESTS")
        print("-" * 30)
        self.test_ride_request_creation()
        self.test_ride_acceptance()
        self.test_my_rides("rider")
        self.test_my_rides("driver")
        
        # Admin tests
        print("\n👑 ADMIN FUNCTIONALITY TESTS")
        print("-" * 30)
        self.test_admin_stats()
        self.test_admin_users()
        self.test_admin_rides()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 ALL TESTS PASSED! The API is working correctly.")
            return True
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} tests failed. Please check the issues above.")
            return False

def main():
    """Main test execution"""
    import sys
    
    # Check if we should run the specific ObjectId serialization test
    if len(sys.argv) > 1 and sys.argv[1] == "objectid":
        tester = MobilityHubAPITester()
        success = tester.run_objectid_serialization_test()
        
        # Save detailed results
        with open('/app/test_results_objectid_fix.json', 'w') as f:
            json.dump({
                'test_type': 'objectid_serialization_fix',
                'summary': {
                    'total_tests': tester.total_tests,
                    'passed_tests': tester.passed_tests,
                    'failed_tests': tester.total_tests - tester.passed_tests,
                    'success_rate': (tester.passed_tests/tester.total_tests*100) if tester.total_tests > 0 else 0,
                    'timestamp': datetime.now().isoformat()
                },
                'detailed_results': tester.test_results
            }, f, indent=2)
        
        return 0 if success else 1
    else:
        # Run comprehensive test
        tester = MobilityHubAPITester()
        success = tester.run_comprehensive_test()
        
        # Save detailed results
        with open('/app/test_results_backend.json', 'w') as f:
            json.dump({
                'summary': {
                    'total_tests': tester.total_tests,
                    'passed_tests': tester.passed_tests,
                    'failed_tests': tester.total_tests - tester.passed_tests,
                    'success_rate': (tester.passed_tests/tester.total_tests*100) if tester.total_tests > 0 else 0,
                    'timestamp': datetime.now().isoformat()
                },
                'detailed_results': tester.test_results
            }, f, indent=2)
        
        return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())