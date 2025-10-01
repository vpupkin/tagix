#!/usr/bin/env python3

import requests
import json
import sys
import time
from datetime import datetime
import uuid

class EnhancedDriverPaymentTester:
    def __init__(self, base_url="https://ridesync-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.ride_data = {}  # Store ride-related data
        self.payment_data = {}  # Store payment-related data
        
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
        """Create test driver and rider accounts"""
        print("🔧 Setting up test users...")
        
        # Create rider
        timestamp = int(time.time())
        rider_data = {
            "email": f"test_rider_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Test Rider {timestamp}",
            "phone": f"+1555{timestamp % 10000:04d}",
            "role": "rider"
        }
        
        response = self.make_request('POST', '/api/auth/register', rider_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['rider'] = data['access_token']
            self.users['rider'] = data['user']
            self.log_test("Rider Account Creation", True, f"Rider ID: {data['user']['id']}")
        else:
            self.log_test("Rider Account Creation", False, error="Failed to create rider account")
            return False
        
        # Create driver
        driver_data = {
            "email": f"test_driver_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Test Driver {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 1:04d}",
            "role": "driver"
        }
        
        response = self.make_request('POST', '/api/auth/register', driver_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['driver'] = data['access_token']
            self.users['driver'] = data['user']
            self.log_test("Driver Account Creation", True, f"Driver ID: {data['user']['id']}")
        else:
            self.log_test("Driver Account Creation", False, error="Failed to create driver account")
            return False
        
        # Create admin
        admin_data = {
            "email": f"test_admin_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Test Admin {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 2:04d}",
            "role": "admin"
        }
        
        response = self.make_request('POST', '/api/auth/register', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['admin'] = data['access_token']
            self.users['admin'] = data['user']
            self.log_test("Admin Account Creation", True, f"Admin ID: {data['user']['id']}")
        else:
            self.log_test("Admin Account Creation", False, error="Failed to create admin account")
            return False
        
        return True

    def setup_driver_profile(self):
        """Create driver profile"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Profile Setup", False, error="No driver token available")
            return False
            
        profile_data = {
            "vehicle_type": "economy",
            "vehicle_make": "Toyota",
            "vehicle_model": "Camry",
            "vehicle_year": 2020,
            "license_plate": "TEST123",
            "license_number": "DL987654321"
        }
        
        response = self.make_request('POST', '/api/driver/profile', profile_data, auth_token=token)
        
        if response and response.status_code == 200:
            self.log_test("Driver Profile Setup", True, "Driver profile created successfully")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Profile Setup", False, error=f"HTTP {status}")
            return False

    def test_driver_location_update(self):
        """Test driver location update"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Location Update", False, error="No driver token available")
            return False
            
        location_data = {
            "location": {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "address": "San Francisco, CA"
            }
        }
        
        response = self.make_request('POST', '/api/location/update', location_data, auth_token=token)
        
        if response and response.status_code == 200:
            self.log_test("Driver Location Update", True, "Location updated successfully")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Location Update", False, error=f"HTTP {status}")
            return False

    def test_driver_online_status(self):
        """Test driver going online"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Online Status", False, error="No driver token available")
            return False
            
        response = self.make_request('POST', '/api/driver/online', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Driver Online Status", True, data.get('message', 'Driver status updated'))
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Online Status", False, error=f"HTTP {status}")
            return False

    def test_ride_request_creation(self):
        """Test rider creating a ride request"""
        token = self.tokens.get('rider')
        if not token:
            self.log_test("Ride Request Creation", False, error="No rider token available")
            return False
            
        ride_data = {
            "pickup_location": {
                "latitude": 37.7849,
                "longitude": -122.4094,
                "address": "Downtown San Francisco, CA"
            },
            "dropoff_location": {
                "latitude": 37.7949,
                "longitude": -122.3994,
                "address": "Financial District, San Francisco, CA"
            },
            "vehicle_type": "economy",
            "passenger_count": 1,
            "special_requirements": "Enhanced driver workflow test"
        }
        
        response = self.make_request('POST', '/api/rides/request', ride_data, auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'request_id' in data:
                self.ride_data['request_id'] = data['request_id']
                self.ride_data['estimated_fare'] = data.get('estimated_fare', 0)
                self.log_test("Ride Request Creation", True, 
                            f"Request ID: {data['request_id']}, Fare: ${data.get('estimated_fare', 0):.2f}")
                return True
            else:
                self.log_test("Ride Request Creation", False, error="Missing request_id in response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Request Creation", False, error=f"HTTP {status}")
            return False

    def test_available_rides_endpoint(self):
        """Test /api/rides/available endpoint for drivers"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Available Rides Endpoint", False, error="No driver token available")
            return False
        
        # Ensure driver is online first (toggle might have made them offline)
        online_response = self.make_request('POST', '/api/driver/online', auth_token=token)
        if not online_response or online_response.status_code != 200:
            self.log_test("Available Rides Endpoint", False, error="Failed to set driver online")
            return False
            
        response = self.make_request('GET', '/api/rides/available', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                available_count = len(data)
                self.log_test("Available Rides Endpoint", True, 
                            f"Found {available_count} available rides")
                
                # Store available rides for later use
                if available_count > 0:
                    self.ride_data['available_rides'] = data
                return True
            else:
                self.log_test("Available Rides Endpoint", False, error="Response is not a list")
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
            self.log_test("Available Rides Endpoint", False, error=f"HTTP {status}: {error_msg}")
            return False

    def test_ride_acceptance_via_update_endpoint(self):
        """Test ride acceptance via /api/rides/{ride_id}/update with action='accept'"""
        token = self.tokens.get('driver')
        request_id = self.ride_data.get('request_id')
        
        if not token:
            self.log_test("Ride Acceptance via Update", False, error="No driver token available")
            return False
        if not request_id:
            self.log_test("Ride Acceptance via Update", False, error="No ride request ID available")
            return False
            
        update_data = {
            "action": "accept",
            "notes": "Accepting ride via enhanced workflow"
        }
        
        response = self.make_request('POST', f'/api/rides/{request_id}/update', update_data, auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'match_id' in data:
                self.ride_data['match_id'] = data['match_id']
                self.log_test("Ride Acceptance via Update", True, 
                            f"Match ID: {data['match_id']}, Status: {data.get('status', 'accepted')}")
                return True
            else:
                self.log_test("Ride Acceptance via Update", False, error="Missing match_id in response")
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
            self.log_test("Ride Acceptance via Update", False, error=f"HTTP {status}: {error_msg}")
            return False

    def test_ride_lifecycle_transitions(self):
        """Test full ride lifecycle: arrive → start → complete"""
        token = self.tokens.get('driver')
        match_id = self.ride_data.get('match_id')
        
        if not token:
            self.log_test("Ride Lifecycle Transitions", False, error="No driver token available")
            return False
        if not match_id:
            self.log_test("Ride Lifecycle Transitions", False, error="No match ID available")
            return False
        
        # Test arrive action
        arrive_data = {
            "action": "arrive",
            "location": {
                "latitude": 37.7849,
                "longitude": -122.4094,
                "address": "Pickup location"
            },
            "notes": "Driver has arrived at pickup location"
        }
        
        response = self.make_request('POST', f'/api/rides/{match_id}/update', arrive_data, auth_token=token)
        if response and response.status_code == 200:
            self.log_test("Ride Lifecycle - Arrive", True, "Driver arrival status updated")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Lifecycle - Arrive", False, error=f"HTTP {status}")
            return False
        
        # Test start action
        start_data = {
            "action": "start",
            "notes": "Ride started - passenger picked up"
        }
        
        response = self.make_request('POST', f'/api/rides/{match_id}/update', start_data, auth_token=token)
        if response and response.status_code == 200:
            self.log_test("Ride Lifecycle - Start", True, "Ride started successfully")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Lifecycle - Start", False, error=f"HTTP {status}")
            return False
        
        # Test complete action
        complete_data = {
            "action": "complete",
            "location": {
                "latitude": 37.7949,
                "longitude": -122.3994,
                "address": "Dropoff location"
            },
            "notes": "Ride completed successfully"
        }
        
        response = self.make_request('POST', f'/api/rides/{match_id}/update', complete_data, auth_token=token)
        if response and response.status_code == 200:
            data = response.json()
            if 'payment_id' in data:
                self.payment_data['payment_id'] = data['payment_id']
                self.payment_data['amount'] = data.get('amount', 0)
                self.payment_data['driver_earnings'] = data.get('driver_earnings', 0)
                self.log_test("Ride Lifecycle - Complete", True, 
                            f"Ride completed, Payment ID: {data['payment_id']}, "
                            f"Amount: ${data.get('amount', 0):.2f}, "
                            f"Driver Earnings: ${data.get('driver_earnings', 0):.2f}")
                return True
            else:
                self.log_test("Ride Lifecycle - Complete", False, error="Missing payment_id in response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Lifecycle - Complete", False, error=f"HTTP {status}")
            return False

    def test_automatic_payment_creation(self):
        """Verify automatic payment creation when ride is completed"""
        payment_id = self.payment_data.get('payment_id')
        
        if not payment_id:
            self.log_test("Automatic Payment Creation", False, error="No payment ID from ride completion")
            return False
        
        # Verify payment was created with correct data
        expected_amount = self.ride_data.get('estimated_fare', 0)
        actual_amount = self.payment_data.get('amount', 0)
        driver_earnings = self.payment_data.get('driver_earnings', 0)
        
        # Check revenue split (80% driver, 20% platform)
        expected_driver_earnings = expected_amount * 0.80
        expected_platform_fee = expected_amount * 0.20
        
        if abs(driver_earnings - expected_driver_earnings) < 0.01:
            self.log_test("Automatic Payment Creation", True, 
                        f"Payment created correctly - Amount: ${actual_amount:.2f}, "
                        f"Driver: ${driver_earnings:.2f} (80%), "
                        f"Platform: ${expected_platform_fee:.2f} (20%)")
            return True
        else:
            self.log_test("Automatic Payment Creation", False, 
                        error=f"Revenue split incorrect - Expected driver: ${expected_driver_earnings:.2f}, "
                        f"Actual: ${driver_earnings:.2f}")
            return False

    def test_payment_processing(self):
        """Test payment processing via /api/payments/{payment_id}/process"""
        token = self.tokens.get('rider')  # Rider processes payment
        payment_id = self.payment_data.get('payment_id')
        
        if not token:
            self.log_test("Payment Processing", False, error="No rider token available")
            return False
        if not payment_id:
            self.log_test("Payment Processing", False, error="No payment ID available")
            return False
        
        response = self.make_request('POST', f'/api/payments/{payment_id}/process', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('status') == 'completed':
                self.log_test("Payment Processing", True, 
                            f"Payment processed successfully - Status: {data['status']}, "
                            f"Amount: ${data.get('amount', 0):.2f}")
                return True
            else:
                self.log_test("Payment Processing", False, 
                            error=f"Payment not completed - Status: {data.get('status', 'unknown')}")
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
            self.log_test("Payment Processing", False, error=f"HTTP {status}: {error_msg}")
            return False

    def test_driver_payment_summary(self):
        """Test payment summary endpoints for drivers"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Payment Summary", False, error="No driver token available")
            return False
        
        response = self.make_request('GET', '/api/payments/summary', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            expected_keys = ['total_earnings', 'total_rides', 'total_revenue']
            if all(key in data for key in expected_keys):
                self.log_test("Driver Payment Summary", True, 
                            f"Earnings: ${data.get('total_earnings', 0):.2f}, "
                            f"Rides: {data.get('total_rides', 0)}, "
                            f"Revenue: ${data.get('total_revenue', 0):.2f}")
                return True
            else:
                missing_keys = [key for key in expected_keys if key not in data]
                self.log_test("Driver Payment Summary", False, 
                            error=f"Missing keys: {missing_keys}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Payment Summary", False, error=f"HTTP {status}")
            return False

    def test_admin_payment_summary(self):
        """Test payment summary endpoints for admin"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Payment Summary", False, error="No admin token available")
            return False
        
        response = self.make_request('GET', '/api/payments/summary', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            expected_keys = ['total_platform_revenue', 'total_driver_earnings', 'total_gross_revenue', 'total_transactions']
            if all(key in data for key in expected_keys):
                self.log_test("Admin Payment Summary", True, 
                            f"Platform Revenue: ${data.get('total_platform_revenue', 0):.2f}, "
                            f"Driver Earnings: ${data.get('total_driver_earnings', 0):.2f}, "
                            f"Gross Revenue: ${data.get('total_gross_revenue', 0):.2f}, "
                            f"Transactions: {data.get('total_transactions', 0)}")
                return True
            else:
                missing_keys = [key for key in expected_keys if key not in data]
                self.log_test("Admin Payment Summary", False, 
                            error=f"Missing keys: {missing_keys}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Payment Summary", False, error=f"HTTP {status}")
            return False

    def test_admin_rides_monitoring(self):
        """Test admin access to all rides via /api/admin/rides"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Rides Monitoring", False, error="No admin token available")
            return False
        
        response = self.make_request('GET', '/api/admin/rides', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Admin Rides Monitoring", True, 
                            f"Admin can access {len(data)} rides")
                return True
            else:
                self.log_test("Admin Rides Monitoring", False, error="Response is not a list")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Rides Monitoring", False, error=f"HTTP {status}")
            return False

    def test_audit_logging_verification(self):
        """Verify audit logging for ride and payment operations"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Audit Logging Verification", False, error="No admin token available")
            return False
        
        response = self.make_request('GET', '/api/audit/logs?limit=100', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Look for ride and payment related audit entries
                ride_logs = [log for log in data if 'ride' in log.get('entity_type', '').lower() or 
                           'ride' in log.get('action', '').lower()]
                payment_logs = [log for log in data if 'payment' in log.get('entity_type', '').lower() or 
                              'payment' in log.get('action', '').lower()]
                
                self.log_test("Audit Logging Verification", True, 
                            f"Found {len(data)} total audit logs, "
                            f"{len(ride_logs)} ride-related, "
                            f"{len(payment_logs)} payment-related")
                return True
            else:
                self.log_test("Audit Logging Verification", False, error="Response is not a list")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Audit Logging Verification", False, error=f"HTTP {status}")
            return False

    def run_enhanced_driver_payment_test(self):
        """Run comprehensive enhanced driver workflow and payment system test"""
        print("🚀 Starting Enhanced Driver Workflow and Payment System Testing")
        print("=" * 80)
        
        # Setup phase
        print("\n🔧 SETUP PHASE")
        print("-" * 40)
        if not self.setup_test_users():
            print("❌ Failed to setup test users. Aborting test.")
            return False
        
        if not self.setup_driver_profile():
            print("❌ Failed to setup driver profile. Aborting test.")
            return False
        
        # Enhanced Driver Workflow Testing
        print("\n🚗 ENHANCED DRIVER WORKFLOW TESTING")
        print("-" * 40)
        self.test_driver_location_update()
        self.test_driver_online_status()
        self.test_ride_request_creation()
        self.test_available_rides_endpoint()
        self.test_ride_acceptance_via_update_endpoint()
        self.test_ride_lifecycle_transitions()
        
        # Payment Processing System Testing
        print("\n💳 PAYMENT PROCESSING SYSTEM TESTING")
        print("-" * 40)
        self.test_automatic_payment_creation()
        self.test_payment_processing()
        self.test_driver_payment_summary()
        self.test_admin_payment_summary()
        
        # Admin Monitoring & Audit Testing
        print("\n👑 ADMIN MONITORING & AUDIT TESTING")
        print("-" * 40)
        self.test_admin_rides_monitoring()
        self.test_audit_logging_verification()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 ENHANCED DRIVER WORKFLOW & PAYMENT SYSTEM TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 ALL ENHANCED DRIVER WORKFLOW & PAYMENT TESTS PASSED!")
            print("✅ Enhanced driver workflow and payment system are working correctly.")
            return True
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} tests failed.")
            print("❌ Some issues found in enhanced driver workflow or payment system.")
            return False

def main():
    """Main test execution"""
    tester = EnhancedDriverPaymentTester()
    success = tester.run_enhanced_driver_payment_test()
    
    # Save detailed results
    with open('/app/enhanced_driver_payment_test_results.json', 'w') as f:
        json.dump({
            'test_type': 'enhanced_driver_workflow_and_payment_system',
            'summary': {
                'total_tests': tester.total_tests,
                'passed_tests': tester.passed_tests,
                'failed_tests': tester.total_tests - tester.passed_tests,
                'success_rate': (tester.passed_tests/tester.total_tests*100) if tester.total_tests > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results,
            'test_data': {
                'ride_data': tester.ride_data,
                'payment_data': tester.payment_data,
                'users': {k: v for k, v in tester.users.items()}  # Exclude sensitive token data
            }
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())