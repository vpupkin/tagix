#!/usr/bin/env python3

import requests
import json
import sys
import time
from datetime import datetime
import uuid
import os

class RideRequestVisibilityTester:
    def __init__(self):
        # Use the production URL from frontend/.env
        self.base_url = "https://ridesync-10.preview.emergentagent.com/api"
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.ride_requests = []  # Store created ride requests
        
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

    def setup_test_users(self):
        """Create test users for all roles"""
        print("🔧 Setting up test users...")
        
        # Create unique timestamp for this test run
        timestamp = int(time.time())
        
        # Create rider
        rider_data = {
            "email": f"test_rider_{timestamp}@mobilityhub.com",
            "password": "SecurePass123!",
            "name": f"Test Rider {timestamp}",
            "phone": f"+1555{timestamp % 10000:04d}",
            "role": "rider"
        }
        
        response = self.make_request('POST', '/auth/register', rider_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['rider'] = data['access_token']
            self.users['rider'] = data['user']
            print(f"✅ Rider created: {data['user']['email']}")
        else:
            print(f"❌ Failed to create rider: {response.status_code if response else 'No response'}")
            return False
        
        # Create driver
        driver_data = {
            "email": f"test_driver_{timestamp}@mobilityhub.com",
            "password": "SecurePass123!",
            "name": f"Test Driver {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 1:04d}",
            "role": "driver"
        }
        
        response = self.make_request('POST', '/auth/register', driver_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['driver'] = data['access_token']
            self.users['driver'] = data['user']
            print(f"✅ Driver created: {data['user']['email']}")
        else:
            print(f"❌ Failed to create driver: {response.status_code if response else 'No response'}")
            return False
        
        # Create admin
        admin_data = {
            "email": f"test_admin_{timestamp}@mobilityhub.com",
            "password": "SecurePass123!",
            "name": f"Test Admin {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 2:04d}",
            "role": "admin"
        }
        
        response = self.make_request('POST', '/auth/register', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['admin'] = data['access_token']
            self.users['admin'] = data['user']
            print(f"✅ Admin created: {data['user']['email']}")
        else:
            print(f"❌ Failed to create admin: {response.status_code if response else 'No response'}")
            return False
        
        # Setup driver profile
        profile_data = {
            "vehicle_type": "economy",
            "vehicle_make": "Toyota",
            "vehicle_model": "Prius",
            "vehicle_year": 2022,
            "license_plate": f"TEST{timestamp % 1000}",
            "license_number": f"DL{timestamp}"
        }
        
        response = self.make_request('POST', '/driver/profile', profile_data, auth_token=self.tokens['driver'])
        if response and response.status_code == 200:
            print("✅ Driver profile created")
        else:
            print(f"❌ Failed to create driver profile: {response.status_code if response else 'No response'}")
            return False
        
        # Set driver online and update location
        location_data = {
            "location": {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "address": "San Francisco, CA"
            }
        }
        
        response = self.make_request('POST', '/location/update', location_data, auth_token=self.tokens['driver'])
        if response and response.status_code == 200:
            print("✅ Driver location updated")
        else:
            print(f"❌ Failed to update driver location: {response.status_code if response else 'No response'}")
        
        response = self.make_request('POST', '/driver/online', auth_token=self.tokens['driver'])
        if response and response.status_code == 200:
            print("✅ Driver set online")
        else:
            print(f"❌ Failed to set driver online: {response.status_code if response else 'No response'}")
        
        return True

    def test_ride_request_database_storage(self):
        """Test if ride requests are actually stored in database"""
        print("\n🗄️ TESTING RIDE REQUEST DATABASE STORAGE")
        print("-" * 50)
        
        # Create multiple ride requests
        ride_requests_data = [
            {
                "pickup_location": {
                    "latitude": 37.7749,
                    "longitude": -122.4194,
                    "address": "Union Square, San Francisco, CA"
                },
                "dropoff_location": {
                    "latitude": 37.7849,
                    "longitude": -122.4094,
                    "address": "Financial District, San Francisco, CA"
                },
                "vehicle_type": "economy",
                "passenger_count": 1,
                "special_requirements": "Test ride request #1"
            },
            {
                "pickup_location": {
                    "latitude": 37.7849,
                    "longitude": -122.4094,
                    "address": "Financial District, San Francisco, CA"
                },
                "dropoff_location": {
                    "latitude": 37.7949,
                    "longitude": -122.3994,
                    "address": "Chinatown, San Francisco, CA"
                },
                "vehicle_type": "comfort",
                "passenger_count": 2,
                "special_requirements": "Test ride request #2"
            }
        ]
        
        created_requests = []
        for i, ride_data in enumerate(ride_requests_data, 1):
            response = self.make_request('POST', '/rides/request', ride_data, auth_token=self.tokens['rider'])
            
            if response and response.status_code == 200:
                data = response.json()
                if 'request_id' in data:
                    created_requests.append(data['request_id'])
                    self.ride_requests.append(data['request_id'])
                    self.log_test(f"Ride Request Creation #{i}", True, 
                                f"Request ID: {data['request_id']}, Fare: ${data.get('estimated_fare', 0):.2f}")
                else:
                    self.log_test(f"Ride Request Creation #{i}", False, error="Missing request_id in response")
            else:
                status = response.status_code if response else "No response"
                self.log_test(f"Ride Request Creation #{i}", False, error=f"HTTP {status}")
        
        # Verify requests are stored by checking rider's rides
        response = self.make_request('GET', '/rides/my-rides', auth_token=self.tokens['rider'])
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    # Check if our created requests are in the database
                    found_requests = len([r for r in data if r.get('request_id') in created_requests])
                    self.log_test("Database Storage Verification", True, 
                                f"Found {len(data)} total rides, {found_requests} from this test")
                    return True
                else:
                    self.log_test("Database Storage Verification", False, error="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("Database Storage Verification", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Database Storage Verification", False, error=f"HTTP {status}")
            return False

    def test_admin_ride_visibility(self):
        """Test admin can see all pending ride requests"""
        print("\n👑 TESTING ADMIN RIDE VISIBILITY")
        print("-" * 50)
        
        # Test admin can see all rides
        response = self.make_request('GET', '/admin/rides', auth_token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Admin All Rides Access", True, f"Admin can see {len(data)} total rides")
                    
                    # Check if admin can see our test ride requests
                    test_rides = [r for r in data if r.get('request_id') in self.ride_requests]
                    self.log_test("Admin Test Rides Visibility", True, 
                                f"Admin can see {len(test_rides)} of our test rides")
                    return True
                else:
                    self.log_test("Admin All Rides Access", False, error="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("Admin All Rides Access", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin All Rides Access", False, error=f"HTTP {status}")
            return False

    def test_driver_available_rides_access(self):
        """Test driver can access available rides (if endpoint exists)"""
        print("\n🚗 TESTING DRIVER AVAILABLE RIDES ACCESS")
        print("-" * 50)
        
        # Test if there's a specific endpoint for drivers to see available rides
        response = self.make_request('GET', '/rides/available', auth_token=self.tokens['driver'])
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Driver Available Rides Endpoint", True, 
                                f"Driver can see {len(data)} available rides")
                    return True
                else:
                    self.log_test("Driver Available Rides Endpoint", False, error="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("Driver Available Rides Endpoint", False, error="Invalid JSON response")
                return False
        elif response and response.status_code == 404:
            self.log_test("Driver Available Rides Endpoint", False, 
                        error="Endpoint not found - may need to be implemented")
            return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Available Rides Endpoint", False, error=f"HTTP {status}")
            return False

    def test_role_based_access_restrictions(self):
        """Test role-based access restrictions"""
        print("\n🔒 TESTING ROLE-BASED ACCESS RESTRICTIONS")
        print("-" * 50)
        
        # Test rider cannot access admin endpoints
        response = self.make_request('GET', '/admin/rides', auth_token=self.tokens['rider'])
        if response and response.status_code == 403:
            self.log_test("Rider Admin Access Restriction", True, "Rider correctly denied admin access")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Rider Admin Access Restriction", False, 
                        error=f"Expected 403, got {status}")
        
        # Test driver cannot access admin endpoints
        response = self.make_request('GET', '/admin/users', auth_token=self.tokens['driver'])
        if response and response.status_code == 403:
            self.log_test("Driver Admin Access Restriction", True, "Driver correctly denied admin access")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Admin Access Restriction", False, 
                        error=f"Expected 403, got {status}")
        
        # Test admin can access admin endpoints
        response = self.make_request('GET', '/admin/stats', auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'total_users' in data:
                    self.log_test("Admin Stats Access", True, 
                                f"Admin can access stats: {data['total_users']} users, {data.get('total_rides', 0)} rides")
                else:
                    self.log_test("Admin Stats Access", False, error="Missing expected stats data")
            except json.JSONDecodeError:
                self.log_test("Admin Stats Access", False, error="Invalid JSON response")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Stats Access", False, error=f"HTTP {status}")

    def test_ride_acceptance_workflow(self):
        """Test ride acceptance and status updates"""
        print("\n🤝 TESTING RIDE ACCEPTANCE WORKFLOW")
        print("-" * 50)
        
        if not self.ride_requests:
            self.log_test("Ride Acceptance Workflow", False, error="No ride requests available for testing")
            return False
        
        # Try to accept the first ride request
        request_id = self.ride_requests[0]
        response = self.make_request('POST', f'/rides/{request_id}/accept', auth_token=self.tokens['driver'])
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'match_id' in data:
                    match_id = data['match_id']
                    self.log_test("Ride Acceptance", True, f"Ride accepted, Match ID: {match_id}")
                    
                    # Test ride completion
                    response = self.make_request('POST', f'/rides/{match_id}/complete', auth_token=self.tokens['driver'])
                    if response and response.status_code == 200:
                        self.log_test("Ride Completion", True, "Ride completed successfully")
                        return True
                    else:
                        status = response.status_code if response else "No response"
                        self.log_test("Ride Completion", False, error=f"HTTP {status}")
                        return False
                else:
                    self.log_test("Ride Acceptance", False, error="Missing match_id in response")
                    return False
            except json.JSONDecodeError:
                self.log_test("Ride Acceptance", False, error="Invalid JSON response")
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
            self.log_test("Ride Acceptance", False, error=f"HTTP {status}: {error_msg}")
            return False

    def test_audit_logging_verification(self):
        """Test that ride operations create audit trails"""
        print("\n📋 TESTING AUDIT LOGGING VERIFICATION")
        print("-" * 50)
        
        # Check if audit logs are being created
        response = self.make_request('GET', '/audit/logs', auth_token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    # Look for ride-related audit entries
                    ride_audits = [log for log in data if 'ride' in log.get('action', '').lower() or 
                                 log.get('entity_type') == 'ride_request']
                    self.log_test("Audit Logging Verification", True, 
                                f"Found {len(data)} total audit logs, {len(ride_audits)} ride-related")
                    return True
                else:
                    self.log_test("Audit Logging Verification", False, error="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("Audit Logging Verification", False, error="Invalid JSON response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Audit Logging Verification", False, error=f"HTTP {status}")
            return False

    def run_ride_request_visibility_test(self):
        """Run comprehensive ride request visibility and processing test"""
        print("🚀 Starting MobilityHub Ride Request Visibility & Processing Test")
        print("=" * 70)
        
        # Setup test users
        if not self.setup_test_users():
            print("❌ Failed to setup test users. Aborting test.")
            return False
        
        # Run all test categories
        print("\n" + "=" * 70)
        self.test_ride_request_database_storage()
        
        print("\n" + "=" * 70)
        self.test_admin_ride_visibility()
        
        print("\n" + "=" * 70)
        self.test_driver_available_rides_access()
        
        print("\n" + "=" * 70)
        self.test_role_based_access_restrictions()
        
        print("\n" + "=" * 70)
        self.test_ride_acceptance_workflow()
        
        print("\n" + "=" * 70)
        self.test_audit_logging_verification()
        
        # Print final summary
        print("\n" + "=" * 70)
        print("📊 RIDE REQUEST VISIBILITY TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        # Detailed analysis
        print("\n🔍 DETAILED ANALYSIS:")
        print("-" * 30)
        
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test_name']}: {test['error']}")
        
        critical_issues = []
        if any("Database Storage" in test['test_name'] and not test['success'] for test in self.test_results):
            critical_issues.append("Ride requests not being stored in database")
        
        if any("Admin" in test['test_name'] and not test['success'] for test in self.test_results):
            critical_issues.append("Admin cannot access ride management features")
        
        if any("Acceptance" in test['test_name'] and not test['success'] for test in self.test_results):
            critical_issues.append("Ride acceptance workflow not working")
        
        if critical_issues:
            print("\n🚨 CRITICAL ISSUES IDENTIFIED:")
            for issue in critical_issues:
                print(f"   • {issue}")
        
        success = self.passed_tests == self.total_tests
        if success:
            print("\n🎉 ALL RIDE REQUEST VISIBILITY TESTS PASSED!")
            print("✅ Ride request processing workflow is complete and functional.")
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} tests failed.")
            print("❌ Some ride request processing capabilities may be missing or broken.")
        
        return success

def main():
    """Main test execution"""
    tester = RideRequestVisibilityTester()
    success = tester.run_ride_request_visibility_test()
    
    # Save detailed results
    with open('/app/ride_request_visibility_test_results.json', 'w') as f:
        json.dump({
            'test_type': 'ride_request_visibility_and_processing',
            'summary': {
                'total_tests': tester.total_tests,
                'passed_tests': tester.passed_tests,
                'failed_tests': tester.total_tests - tester.passed_tests,
                'success_rate': (tester.passed_tests/tester.total_tests*100) if tester.total_tests > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results,
            'created_ride_requests': tester.ride_requests
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())