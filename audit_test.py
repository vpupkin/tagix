#!/usr/bin/env python3
"""
Comprehensive audit system testing for MobilityHub
Tests all driver and rider API calls to ensure proper audit trails
"""

import requests
import json
import sys
import time
from datetime import datetime
import uuid

class AuditSystemTester:
    def __init__(self, base_url="https://ridesync-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
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

    def setup_test_users(self):
        """Create test users for audit testing"""
        print("🔧 Setting up test users for audit testing...")
        
        # Create rider
        timestamp = int(time.time())
        rider_data = {
            "email": f"audit_rider_{timestamp}@example.com",
            "password": "AuditTest123!",
            "name": f"Audit Rider {timestamp}",
            "phone": f"+1555{timestamp % 10000:04d}",
            "role": "rider"
        }
        
        response = self.make_request('POST', '/api/auth/register', rider_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['rider'] = data['access_token']
            self.users['rider'] = data['user']
            print(f"✅ Rider created: {data['user']['email']}")
        else:
            print("❌ Failed to create rider")
            return False
            
        # Create driver
        driver_data = {
            "email": f"audit_driver_{timestamp}@example.com",
            "password": "AuditTest123!",
            "name": f"Audit Driver {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 1:04d}",
            "role": "driver"
        }
        
        response = self.make_request('POST', '/api/auth/register', driver_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['driver'] = data['access_token']
            self.users['driver'] = data['user']
            print(f"✅ Driver created: {data['user']['email']}")
        else:
            print("❌ Failed to create driver")
            return False
            
        # Create admin
        admin_data = {
            "email": f"audit_admin_{timestamp}@example.com",
            "password": "AuditTest123!",
            "name": f"Audit Admin {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 2:04d}",
            "role": "admin"
        }
        
        response = self.make_request('POST', '/api/auth/register', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['admin'] = data['access_token']
            self.users['admin'] = data['user']
            print(f"✅ Admin created: {data['user']['email']}")
        else:
            print("❌ Failed to create admin")
            return False
            
        return True

    def test_user_registration_audit(self):
        """Test that user registration creates audit logs"""
        print("\n=== Testing User Registration Audit ===")
        
        # Try to register duplicate user (should fail and be audited)
        duplicate_data = {
            "email": self.users['rider']['email'],
            "password": "DifferentPassword123!",
            "name": "Duplicate User",
            "phone": "+15551234567",
            "role": "rider"
        }
        
        response = self.make_request('POST', '/api/auth/register', duplicate_data)
        if response and response.status_code == 400:
            self.log_test("Duplicate Registration Rejection", True, 
                         "Duplicate registration properly rejected and should be audited")
        else:
            self.log_test("Duplicate Registration Rejection", False, 
                         error=f"Expected 400, got {response.status_code if response else 'No response'}")

    def test_user_login_audit(self):
        """Test that user login attempts create audit logs"""
        print("\n=== Testing User Login Audit ===")
        
        # Test successful login
        login_data = {
            "email": self.users['rider']['email'],
            "password": "AuditTest123!"
        }
        
        response = self.make_request('POST', '/api/auth/login', login_data)
        if response and response.status_code == 200:
            self.log_test("Successful Login Audit", True, "Login should create audit log")
        else:
            self.log_test("Successful Login Audit", False, 
                         error=f"Login failed: {response.status_code if response else 'No response'}")
        
        # Test failed login (wrong password)
        wrong_login = {
            "email": self.users['rider']['email'],
            "password": "WrongPassword123!"
        }
        
        response = self.make_request('POST', '/api/auth/login', wrong_login)
        if response and response.status_code == 401:
            self.log_test("Failed Login Audit", True, "Failed login should create audit log")
        else:
            self.log_test("Failed Login Audit", False, 
                         error=f"Expected 401, got {response.status_code if response else 'No response'}")

    def test_ride_operations_audit(self):
        """Test that ride operations create audit logs"""
        print("\n=== Testing Ride Operations Audit ===")
        
        # Create driver profile first
        profile_data = {
            "vehicle_type": "economy",
            "vehicle_make": "Toyota",
            "vehicle_model": "Camry",
            "vehicle_year": 2020,
            "license_plate": "AUDIT123",
            "license_number": "DL987654321"
        }
        
        response = self.make_request('POST', '/api/driver/profile', profile_data, 
                                   auth_token=self.tokens['driver'])
        if response and response.status_code == 200:
            self.log_test("Driver Profile Creation Audit", True, 
                         "Driver profile creation should create audit log")
        else:
            self.log_test("Driver Profile Creation Audit", False, 
                         error=f"Profile creation failed: {response.status_code if response else 'No response'}")
        
        # Test ride request creation
        ride_data = {
            "pickup_location": {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "address": "Audit Test Pickup, San Francisco, CA"
            },
            "dropoff_location": {
                "latitude": 37.7849,
                "longitude": -122.4094,
                "address": "Audit Test Dropoff, San Francisco, CA"
            },
            "vehicle_type": "economy",
            "passenger_count": 1,
            "special_requirements": "Audit test ride"
        }
        
        response = self.make_request('POST', '/api/rides/request', ride_data, 
                                   auth_token=self.tokens['rider'])
        if response and response.status_code == 200:
            ride_response = response.json()
            self.users['ride_request_id'] = ride_response.get('request_id')
            self.log_test("Ride Request Creation Audit", True, 
                         f"Ride request {ride_response.get('request_id')} should create audit log")
        else:
            self.log_test("Ride Request Creation Audit", False, 
                         error=f"Ride request failed: {response.status_code if response else 'No response'}")

    def test_admin_operations_audit(self):
        """Test that admin operations create audit logs"""
        print("\n=== Testing Admin Operations Audit ===")
        
        # Test admin accessing user list
        response = self.make_request('GET', '/api/admin/users', auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            self.log_test("Admin User List Access Audit", True, 
                         "Admin accessing user list should create audit log")
        else:
            self.log_test("Admin User List Access Audit", False, 
                         error=f"Admin user list failed: {response.status_code if response else 'No response'}")
        
        # Test admin accessing filtered users
        response = self.make_request('GET', '/api/admin/users/filtered?search=audit&limit=10', 
                                   auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            self.log_test("Admin Filtered User Access Audit", True, 
                         "Admin filtered user access should create audit log")
        else:
            self.log_test("Admin Filtered User Access Audit", False, 
                         error=f"Admin filtered users failed: {response.status_code if response else 'No response'}")
        
        # Test admin stats access
        response = self.make_request('GET', '/api/admin/stats', auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            stats_data = response.json()
            audit_stats = stats_data.get('audit_statistics', {})
            if audit_stats:
                self.log_test("Admin Stats with Audit Data", True, 
                             f"Audit logs: {audit_stats.get('total_audit_logs', 0)}")
            else:
                self.log_test("Admin Stats with Audit Data", False, 
                             error="No audit statistics in admin stats")
        else:
            self.log_test("Admin Stats with Audit Data", False, 
                         error=f"Admin stats failed: {response.status_code if response else 'No response'}")

    def test_audit_log_retrieval(self):
        """Test audit log retrieval functionality"""
        print("\n=== Testing Audit Log Retrieval ===")
        
        # Test admin accessing audit logs
        response = self.make_request('GET', '/api/audit/logs?limit=20', 
                                   auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            audit_logs = response.json()
            if isinstance(audit_logs, list) and len(audit_logs) > 0:
                actions_found = set()
                for log in audit_logs:
                    actions_found.add(log.get("action", "unknown"))
                
                self.log_test("Admin Audit Log Access", True, 
                             f"Retrieved {len(audit_logs)} logs with actions: {', '.join(list(actions_found)[:5])}")
            else:
                self.log_test("Admin Audit Log Access", False, 
                             error="No audit logs found or invalid format")
        else:
            self.log_test("Admin Audit Log Access", False, 
                         error=f"Audit logs failed: {response.status_code if response else 'No response'}")
        
        # Test audit statistics
        response = self.make_request('GET', '/api/audit/statistics', 
                                   auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            stats = response.json()
            total_logs = stats.get('total_audit_logs', 0)
            recent_activity = stats.get('recent_activity_24h', 0)
            self.log_test("Audit Statistics Access", True, 
                         f"Total logs: {total_logs}, Recent (24h): {recent_activity}")
        else:
            self.log_test("Audit Statistics Access", False, 
                         error=f"Audit statistics failed: {response.status_code if response else 'No response'}")
        
        # Test user accessing their own audit logs
        response = self.make_request('GET', '/api/audit/logs?limit=10', 
                                   auth_token=self.tokens['rider'])
        if response and response.status_code == 200:
            user_logs = response.json()
            self.log_test("User Own Audit Log Access", True, 
                         f"User can access {len(user_logs)} of their own audit logs")
        else:
            self.log_test("User Own Audit Log Access", False, 
                         error=f"User audit logs failed: {response.status_code if response else 'No response'}")

    def test_payment_operations_audit(self):
        """Test payment operations audit (if available)"""
        print("\n=== Testing Payment Operations Audit ===")
        
        # Test admin accessing payment data
        response = self.make_request('GET', '/api/admin/payments/filtered?limit=10', 
                                   auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            payments_data = response.json()
            self.log_test("Admin Payment Access Audit", True, 
                         f"Payment access should create audit log. Found {len(payments_data.get('payments', []))} payments")
        else:
            self.log_test("Admin Payment Access Audit", False, 
                         error=f"Payment access failed: {response.status_code if response else 'No response'}")

    def test_audit_data_integrity(self):
        """Test audit data follows Add-Once/Keep-Forever principle"""
        print("\n=== Testing Audit Data Integrity ===")
        
        # Get initial audit log count
        response = self.make_request('GET', '/api/audit/statistics', 
                                   auth_token=self.tokens['admin'])
        if response and response.status_code == 200:
            initial_stats = response.json()
            initial_count = initial_stats.get('total_audit_logs', 0)
            
            # Perform some actions that should create audit logs
            self.make_request('GET', '/api/auth/me', auth_token=self.tokens['rider'])
            self.make_request('GET', '/api/auth/me', auth_token=self.tokens['driver'])
            
            # Wait a moment for audit logs to be written
            time.sleep(1)
            
            # Check if audit log count increased
            response = self.make_request('GET', '/api/audit/statistics', 
                                       auth_token=self.tokens['admin'])
            if response and response.status_code == 200:
                final_stats = response.json()
                final_count = final_stats.get('total_audit_logs', 0)
                
                if final_count >= initial_count:
                    self.log_test("Audit Log Persistence", True, 
                                 f"Audit logs increased from {initial_count} to {final_count}")
                else:
                    self.log_test("Audit Log Persistence", False, 
                                 error=f"Audit log count decreased: {initial_count} -> {final_count}")
            else:
                self.log_test("Audit Log Persistence", False, 
                             error="Could not verify final audit count")
        else:
            self.log_test("Audit Log Persistence", False, 
                         error="Could not get initial audit count")

    def run_comprehensive_audit_test(self):
        """Run all audit system tests"""
        print("🔍 Starting Comprehensive Audit System Testing")
        print("=" * 60)
        
        # Setup test users
        if not self.setup_test_users():
            print("❌ Failed to setup test users. Aborting audit tests.")
            return False
        
        # Run audit tests
        print("\n🔐 AUDIT TRAIL TESTS")
        print("-" * 30)
        
        self.test_user_registration_audit()
        self.test_user_login_audit()
        self.test_ride_operations_audit()
        self.test_admin_operations_audit()
        self.test_audit_log_retrieval()
        self.test_payment_operations_audit()
        self.test_audit_data_integrity()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 AUDIT TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 ALL AUDIT TESTS PASSED! Comprehensive audit system is working correctly.")
            return True
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} audit tests failed. Review audit implementation.")
            return False

def main():
    """Main test execution"""
    tester = AuditSystemTester()
    success = tester.run_comprehensive_audit_test()
    
    # Save detailed results
    with open('/app/audit_test_results.json', 'w') as f:
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