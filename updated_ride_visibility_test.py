#!/usr/bin/env python3
"""
Updated comprehensive test suite for MobilityHub ride request visibility
Testing all the new endpoints and functionality
"""

import requests
import json
import time
from datetime import datetime

class UpdatedRideVisibilityTester:
    def __init__(self):
        # Use the production URL from frontend/.env
        self.base_url = "http://localhost:8001/api"
        self.results = {
            "test_type": "updated_ride_request_visibility",
            "summary": {
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "success_rate": 0.0,
                "timestamp": datetime.now().isoformat()
            },
            "detailed_results": [],
            "created_ride_requests": []
        }
        
        # Test users
        self.test_users = {
            "rider": {
                "email": "test_rider_updated@example.com",
                "password": "testpass123",
                "name": "Test Rider Updated",
                "phone": "+1234567890",
                "role": "rider"
            },
            "driver": {
                "email": "test_driver_updated@example.com", 
                "password": "testpass123",
                "name": "Test Driver Updated",
                "phone": "+1234567891",
                "role": "driver"
            },
            "admin": {
                "email": "test_admin_updated@example.com",
                "password": "adminpass123", 
                "name": "Test Admin Updated",
                "phone": "+1234567892",
                "role": "admin"
            }
        }
        
        self.tokens = {}
        self.user_ids = {}

    def log_test(self, test_name, success, details="", error=""):
        """Log test result"""
        self.results["summary"]["total_tests"] += 1
        if success:
            self.results["summary"]["passed_tests"] += 1
        else:
            self.results["summary"]["failed_tests"] += 1
        
        self.results["detailed_results"].append({
            "test_name": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        })
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")

    def make_request(self, method, endpoint, data=None, headers=None, auth_token=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {"Content-Type": "application/json"}
        
        if auth_token:
            request_headers["Authorization"] = f"Bearer {auth_token}"
        
        if headers:
            request_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
            else:
                return None
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def setup_test_users(self):
        """Setup test users and get authentication tokens"""
        print("\n🔧 SETTING UP TEST USERS")
        print("-" * 50)
        
        for role, user_data in self.test_users.items():
            # Register user
            response = self.make_request('POST', '/auth/register', user_data)
            if response and response.status_code == 200:
                data = response.json()
                self.tokens[role] = data["access_token"]
                self.user_ids[role] = data["user"]["id"]
                print(f"✅ {role.capitalize()} registered: {data['user']['id']}")
            else:
                # Try to login if registration fails (user might exist)
                login_data = {
                    "email": user_data["email"],
                    "password": user_data["password"]
                }
                response = self.make_request('POST', '/auth/login', login_data)
                if response and response.status_code == 200:
                    data = response.json()
                    self.tokens[role] = data["access_token"]
                    self.user_ids[role] = data["user"]["id"]
                    print(f"✅ {role.capitalize()} logged in: {data['user']['id']}")
                else:
                    print(f"❌ Failed to setup {role}: {response.status_code if response else 'No response'}")

    def test_01_ride_request_creation(self):
        """Test ride request creation"""
        print("\n🚗 TESTING RIDE REQUEST CREATION")
        print("-" * 50)
        
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
        
        response = self.make_request('POST', '/rides/request', ride_request, auth_token=self.tokens['rider'])
        
        if response and response.status_code == 200:
            data = response.json()
            request_id = data["request_id"]
            self.results["created_ride_requests"].append(request_id)
            self.log_test("Ride Request Creation", True, f"Request ID: {request_id}, Fare: ${data.get('estimated_fare', 0):.2f}")
            return request_id
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Request Creation", False, error=f"HTTP {status}")
            return None

    def test_02_rider_pending_requests_endpoint(self):
        """Test new rider pending requests endpoint"""
        print("\n👤 TESTING RIDER PENDING REQUESTS ENDPOINT")
        print("-" * 50)
        
        response = self.make_request('GET', '/rides/my-requests', auth_token=self.tokens['rider'])
        
        if response and response.status_code == 200:
            data = response.json()
            pending_count = data.get("total_pending", 0)
            completed_count = data.get("total_completed", 0)
            self.log_test("Rider Pending Requests Endpoint", True, 
                        f"Pending: {pending_count}, Completed: {completed_count}")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Rider Pending Requests Endpoint", False, error=f"HTTP {status}")
            return False

    def test_03_driver_available_rides_endpoint(self):
        """Test fixed driver available rides endpoint"""
        print("\n🚗 TESTING DRIVER AVAILABLE RIDES ENDPOINT")
        print("-" * 50)
        
        # First, set driver location and make them online
        location_data = {
            "location": {
                "latitude": 37.7750,
                "longitude": -122.4195,
                "address": "Driver Location, San Francisco, CA"
            }
        }
        
        # Update driver location
        self.make_request('POST', '/location/update', location_data, auth_token=self.tokens['driver'])
        
        # Toggle driver online
        self.make_request('POST', '/driver/online', auth_token=self.tokens['driver'])
        
        # Test available rides endpoint
        response = self.make_request('GET', '/rides/available', auth_token=self.tokens['driver'])
        
        if response and response.status_code == 200:
            data = response.json()
            available_count = data.get("total_available", 0)
            pending_count = data.get("total_pending", 0)
            self.log_test("Driver Available Rides Endpoint", True, 
                        f"Available: {available_count}, Total Pending: {pending_count}")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Available Rides Endpoint", False, error=f"HTTP {status}")
            return False

    def test_04_admin_ride_visibility(self):
        """Test admin can see all ride requests and matches"""
        print("\n👨‍💼 TESTING ADMIN RIDE VISIBILITY")
        print("-" * 50)
        
        # Test basic admin rides endpoint
        response = self.make_request('GET', '/admin/rides', auth_token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            data = response.json()
            pending_count = data.get("total_pending", 0)
            completed_count = data.get("total_completed", 0)
            total_count = data.get("total_rides", 0)
            self.log_test("Admin All Rides Access", True, 
                        f"Pending: {pending_count}, Completed: {completed_count}, Total: {total_count}")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin All Rides Access", False, error=f"HTTP {status}")
            return False

    def test_05_unified_ride_endpoint(self):
        """Test new unified ride endpoint for all roles"""
        print("\n🔄 TESTING UNIFIED RIDE ENDPOINT")
        print("-" * 50)
        
        # Test for each role
        roles_tested = 0
        roles_passed = 0
        
        for role in ['rider', 'driver', 'admin']:
            response = self.make_request('GET', '/rides/unified', auth_token=self.tokens[role])
            
            if response and response.status_code == 200:
                data = response.json()
                role_returned = data.get("role", "unknown")
                statistics = data.get("statistics", {})
                
                if role_returned == role:
                    roles_passed += 1
                    self.log_test(f"Unified Endpoint - {role.capitalize()}", True, 
                                f"Role: {role_returned}, Stats: {statistics}")
                else:
                    self.log_test(f"Unified Endpoint - {role.capitalize()}", False, 
                                error=f"Expected role {role}, got {role_returned}")
            else:
                status = response.status_code if response else "No response"
                self.log_test(f"Unified Endpoint - {role.capitalize()}", False, error=f"HTTP {status}")
            
            roles_tested += 1
        
        return roles_passed == roles_tested

    def test_06_role_based_access_control(self):
        """Test role-based access control"""
        print("\n🔒 TESTING ROLE-BASED ACCESS CONTROL")
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
        response = self.make_request('GET', '/admin/rides', auth_token=self.tokens['driver'])
        if response and response.status_code == 403:
            self.log_test("Driver Admin Access Restriction", True, "Driver correctly denied admin access")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Admin Access Restriction", False, 
                        error=f"Expected 403, got {status}")
        
        # Test admin can access admin endpoints
        response = self.make_request('GET', '/admin/rides', auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            self.log_test("Admin Access Granted", True, "Admin can access admin endpoints")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Access Granted", False, error=f"HTTP {status}")

    def test_07_ride_acceptance_workflow(self):
        """Test complete ride acceptance workflow"""
        print("\n🤝 TESTING RIDE ACCEPTANCE WORKFLOW")
        print("-" * 50)
        
        # Create a ride request first
        request_id = self.test_01_ride_request_creation()
        if not request_id:
            self.log_test("Ride Acceptance Workflow", False, error="No ride request to accept")
            return False
        
        # Driver accepts the ride
        response = self.make_request('POST', f'/rides/{request_id}/accept', auth_token=self.tokens['driver'])
        
        if response and response.status_code == 200:
            data = response.json()
            match_id = data.get("match_id")
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
            status = response.status_code if response else "No response"
            self.log_test("Ride Acceptance", False, error=f"HTTP {status}")
            return False

    def test_08_audit_logging_verification(self):
        """Test audit logging for new endpoints"""
        print("\n📋 TESTING AUDIT LOGGING VERIFICATION")
        print("-" * 50)
        
        response = self.make_request('GET', '/audit/logs?limit=50', auth_token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            audit_logs = response.json()
            total_logs = len(audit_logs)
            
            # Count ride-related logs
            ride_logs = [log for log in audit_logs if 'ride' in log.get('entity_type', '').lower()]
            ride_log_count = len(ride_logs)
            
            self.log_test("Audit Logging Verification", True, 
                        f"Found {total_logs} total audit logs, {ride_log_count} ride-related")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Audit Logging Verification", False, error=f"HTTP {status}")
            return False

    def run_updated_ride_visibility_test(self):
        """Run all updated ride visibility tests"""
        print("🚀 Starting Updated Ride Request Visibility Testing")
        print("=" * 60)
        
        # Setup test users
        self.setup_test_users()
        
        # Run tests
        test_methods = [
            self.test_01_ride_request_creation,
            self.test_02_rider_pending_requests_endpoint,
            self.test_03_driver_available_rides_endpoint,
            self.test_04_admin_ride_visibility,
            self.test_05_unified_ride_endpoint,
            self.test_06_role_based_access_control,
            self.test_07_ride_acceptance_workflow,
            self.test_08_audit_logging_verification
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_test(test_method.__name__, False, error=str(e))
        
        # Calculate success rate
        total = self.results["summary"]["total_tests"]
        passed = self.results["summary"]["passed_tests"]
        self.results["summary"]["success_rate"] = (passed / total * 100) if total > 0 else 0
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 UPDATED TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {self.results['summary']['failed_tests']}")
        print(f"Success Rate: {self.results['summary']['success_rate']:.1f}%")
        
        if self.results['summary']['success_rate'] >= 90:
            print("🎉 EXCELLENT! All critical functionality is working!")
        elif self.results['summary']['success_rate'] >= 75:
            print("✅ GOOD! Most functionality is working, minor issues remain.")
        else:
            print("⚠️ NEEDS WORK! Several issues need to be addressed.")
        
        # Save results
        with open('updated_ride_visibility_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: updated_ride_visibility_test_results.json")
        
        return self.results['summary']['success_rate'] >= 75

def main():
    """Main test execution"""
    tester = UpdatedRideVisibilityTester()
    success = tester.run_updated_ride_visibility_test()
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
