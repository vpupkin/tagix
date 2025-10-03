 #!/usr/bin/env python3

import requests
import json
import sys
import time
from datetime import datetime
import uuid

class ComprehensiveRideLifecycleTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.ride_data = {}  # Store ride-related data
        self.payment_data = {}  # Store payment-related data
        self.audit_data = {}  # Store audit-related data
        
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
        """Create test rider, driver, and admin accounts"""
        print("🔧 Setting up test users...")
        
        timestamp = int(time.time())
        
        # Create rider
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
        """Create driver profile and set driver online"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Profile Setup", False, error="No driver token available")
            return False
            
        # Create driver profile
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
            self.log_test("Driver Profile Creation", True, "Driver profile created successfully")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Profile Creation", False, error=f"HTTP {status}")
            return False
        
        # Set driver location
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
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Location Update", False, error=f"HTTP {status}")
            return False
        
        # Set driver online
        response = self.make_request('POST', '/api/driver/online', auth_token=token)
        if response and response.status_code == 200:
            self.log_test("Driver Online Status", True, "Driver is now online")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Online Status", False, error=f"HTTP {status}")
            return False
        
        return True

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
            "special_requirements": "Comprehensive ride lifecycle test"
        }
        
        response = self.make_request('POST', '/api/rides/request', ride_data, auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'request_id' in data:
                self.ride_data['request_id'] = data['request_id']
                self.ride_data['estimated_fare'] = data.get('estimated_fare', 0)
                self.ride_data['matches_found'] = data.get('matches_found', 0)
                self.log_test("Ride Request Creation", True, 
                            f"Request ID: {data['request_id']}, Fare: ${data.get('estimated_fare', 0):.2f}, "
                            f"Matches: {data.get('matches_found', 0)}")
                return True
            else:
                self.log_test("Ride Request Creation", False, error="Missing request_id in response")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Request Creation", False, error=f"HTTP {status}")
            return False

    def test_ride_request_status_pending(self):
        """Test that ride request is in pending status"""
        token = self.tokens.get('rider')
        request_id = self.ride_data.get('request_id')
        
        if not token or not request_id:
            self.log_test("Ride Request Status Check", False, error="Missing token or request ID")
            return False
        
        response = self.make_request('GET', '/api/rides/my-requests', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'pending_requests' in data:
                # Find our request in pending_requests
                our_request = None
                for req in data['pending_requests']:
                    if req.get('id') == request_id:
                        our_request = req
                        break
                
                if our_request and our_request.get('status') == 'pending':
                    self.log_test("Ride Request Status Check", True, 
                                f"Request is in pending status as expected")
                    return True
                else:
                    self.log_test("Ride Request Status Check", False, 
                                error=f"Request not found or wrong status: {our_request.get('status') if our_request else 'not found'}")
                    return False
            else:
                self.log_test("Ride Request Status Check", False, error="Response is not a dict with pending_requests")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Request Status Check", False, error=f"HTTP {status}")
            return False

    def test_driver_available_rides(self):
        """Test driver can see available rides"""
        # First check if server is accessible
        if not self.check_server_connectivity():
            self.log_test("Driver Available Rides", False, error="Server not accessible")
            return False
        
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Available Rides", False, error="No driver token available")
            return False
        
        response = self.make_request('GET', '/api/rides/available', auth_token=token)
        
        if response is None:
            self.log_test("Driver Available Rides", False, error="Server connection failed")
            return False
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'available_rides' in data:
                available_rides = data['available_rides']
                available_count = len(available_rides)
                self.log_test("Driver Available Rides", True, 
                            f"Found {available_count} available rides")
                
                # Store available rides for later use
                if available_count > 0:
                    self.ride_data['available_rides'] = available_rides
                    # Find our request in available rides
                    request_id = self.ride_data.get('request_id')
                    our_ride = None
                    for ride in available_rides:
                        if ride.get('id') == request_id:
                            our_ride = ride
                            break
                    
                    if our_ride:
                        self.log_test("Driver Can See Our Ride", True, 
                                    f"Our ride request is visible to driver")
                    else:
                        self.log_test("Driver Can See Our Ride", False, 
                                    error="Our ride request not found in available rides")
                        return False
                return True
            else:
                self.log_test("Driver Available Rides", False, error="Response is not a dict with available_rides")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Available Rides", False, error=f"HTTP {status}")
            return False

    def test_ride_acceptance(self):
        """Test driver accepting the ride request"""
        token = self.tokens.get('driver')
        request_id = self.ride_data.get('request_id')
        
        if not token or not request_id:
            self.log_test("Ride Acceptance", False, error="Missing token or request ID")
            return False
        
        # Use the new update endpoint with action='accept'
        update_data = {
            "action": "accept",
            "notes": "Accepting ride for comprehensive test"
        }
        
        response = self.make_request('POST', f'/api/rides/{request_id}/update', update_data, auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'match_id' in data:
                self.ride_data['match_id'] = data['match_id']
                self.ride_data['acceptance_status'] = data.get('status', 'accepted')
                self.log_test("Ride Acceptance", True, 
                            f"Match ID: {data['match_id']}, Status: {data.get('status', 'accepted')}")
                return True
            else:
                self.log_test("Ride Acceptance", False, error="Missing match_id in response")
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
            self.log_test("Ride Acceptance", False, error=f"HTTP {status}: {error_msg}")
            return False

    def test_ride_status_accepted(self):
        """Test that ride status is now accepted"""
        token = self.tokens.get('rider')
        request_id = self.ride_data.get('request_id')
        
        if not token or not request_id:
            self.log_test("Ride Status Accepted Check", False, error="Missing token or request ID")
            return False
        
        response = self.make_request('GET', '/api/rides/my-requests', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'pending_requests' in data:
                # Find our request in pending_requests
                our_request = None
                for req in data['pending_requests']:
                    if req.get('id') == request_id:
                        our_request = req
                        break
                
                if our_request and our_request.get('status') == 'accepted':
                    self.log_test("Ride Status Accepted Check", True, 
                                f"Request is now in accepted status")
                    return True
                else:
                    self.log_test("Ride Status Accepted Check", False, 
                                error=f"Request status is {our_request.get('status') if our_request else 'not found'}")
                    return False
            else:
                self.log_test("Ride Status Accepted Check", False, error="Response is not a dict with pending_requests")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Status Accepted Check", False, error=f"HTTP {status}")
            return False

    def test_driver_arrival(self):
        """Test driver arriving at pickup location"""
        token = self.tokens.get('driver')
        match_id = self.ride_data.get('match_id')
        
        if not token or not match_id:
            self.log_test("Driver Arrival", False, error="Missing token or match ID")
            return False
        
        arrive_data = {
            "action": "arrive",
            "location": {
                "latitude": 37.7849,
                "longitude": -122.4094,
                "address": "Pickup location - driver arrived"
            },
            "notes": "Driver has arrived at pickup location"
        }
        
        response = self.make_request('POST', f'/api/rides/{match_id}/update', arrive_data, auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.ride_data['arrival_status'] = data.get('status', 'driver_arriving')
            self.log_test("Driver Arrival", True, 
                        f"Driver arrival status updated: {data.get('status', 'driver_arriving')}")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Arrival", False, error=f"HTTP {status}")
            return False

    def test_ride_start(self):
        """Test driver starting the ride"""
        token = self.tokens.get('driver')
        match_id = self.ride_data.get('match_id')
        
        if not token or not match_id:
            self.log_test("Ride Start", False, error="Missing token or match ID")
            return False
        
        start_data = {
            "action": "start",
            "notes": "Ride started - passenger picked up"
        }
        
        response = self.make_request('POST', f'/api/rides/{match_id}/update', start_data, auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.ride_data['start_status'] = data.get('status', 'in_progress')
            self.log_test("Ride Start", True, 
                        f"Ride started successfully: {data.get('status', 'in_progress')}")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Start", False, error=f"HTTP {status}")
            return False

    def test_ride_completion(self):
        """Test driver completing the ride"""
        token = self.tokens.get('driver')
        match_id = self.ride_data.get('match_id')
        
        if not token or not match_id:
            self.log_test("Ride Completion", False, error="Missing token or match ID")
            return False
        
        complete_data = {
            "action": "complete",
            "location": {
                "latitude": 37.7949,
                "longitude": -122.3994,
                "address": "Dropoff location - ride completed"
            },
            "notes": "Ride completed successfully"
        }
        
        response = self.make_request('POST', f'/api/rides/{match_id}/update', complete_data, auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.ride_data['completion_status'] = data.get('status', 'completed')
            
            # Check if payment was created
            if 'payment_id' in data:
                self.payment_data['payment_id'] = data['payment_id']
                self.payment_data['amount'] = data.get('amount', 0)
                self.payment_data['driver_earnings'] = data.get('driver_earnings', 0)
                self.log_test("Ride Completion", True, 
                            f"Ride completed, Payment ID: {data['payment_id']}, "
                            f"Amount: ${data.get('amount', 0):.2f}, "
                            f"Driver Earnings: ${data.get('driver_earnings', 0):.2f}")
            else:
                self.log_test("Ride Completion", True, 
                            f"Ride completed: {data.get('status', 'completed')}")
            return True
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Completion", False, error=f"HTTP {status}")
            return False

    def test_ride_status_completed(self):
        """Test that ride status is now completed"""
        token = self.tokens.get('rider')
        request_id = self.ride_data.get('request_id')
        
        if not token or not request_id:
            self.log_test("Ride Status Completed Check", False, error="Missing token or request ID")
            return False
        
        response = self.make_request('GET', '/api/rides/my-requests', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'completed_rides' in data:
                # Find our request in completed_rides
                our_request = None
                for req in data['completed_rides']:
                    if req.get('ride_request_id') == request_id:
                        our_request = req
                        break
                
                if our_request and our_request.get('status') == 'completed':
                    self.log_test("Ride Status Completed Check", True, 
                                f"Request is now in completed status")
                    return True
                else:
                    self.log_test("Ride Status Completed Check", False, 
                                error=f"Request status is {our_request.get('status') if our_request else 'not found'}")
                    return False
            else:
                self.log_test("Ride Status Completed Check", False, error="Response is not a dict with completed_rides")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Status Completed Check", False, error=f"HTTP {status}")
            return False

    def test_payment_processing(self):
        """Test payment processing"""
        token = self.tokens.get('rider')
        payment_id = self.payment_data.get('payment_id')
        
        if not token or not payment_id:
            self.log_test("Payment Processing", False, error="Missing token or payment ID")
            return False
        
        response = self.make_request('POST', f'/api/payments/{payment_id}/process', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('status') == 'completed':
                self.payment_data['processing_status'] = 'completed'
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
            self.log_test("Payment Processing", False, error=f"HTTP {status}")
            return False

    def test_admin_ride_monitoring(self):
        """Test admin can monitor all rides"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Ride Monitoring", False, error="No admin token available")
            return False
        
        # Test admin rides endpoint
        response = self.make_request('GET', '/api/admin/rides', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'pending_requests' in data and 'completed_matches' in data:
                pending_count = len(data['pending_requests'])
                completed_count = len(data['completed_matches'])
                self.log_test("Admin Ride Monitoring", True, 
                            f"Admin can see {pending_count} pending requests and {completed_count} completed matches")
                
                # Check if our ride is in the completed matches
                request_id = self.ride_data.get('request_id')
                match_id = self.ride_data.get('match_id')
                our_ride_found = False
                
                for match in data['completed_matches']:
                    if match.get('id') == match_id or match.get('ride_request_id') == request_id:
                        our_ride_found = True
                        break
                
                if our_ride_found:
                    self.log_test("Admin Can See Our Completed Ride", True, 
                                "Admin can see our completed ride in the system")
                else:
                    self.log_test("Admin Can See Our Completed Ride", False, 
                                error="Admin cannot see our completed ride")
                    return False
                
                return True
            else:
                self.log_test("Admin Ride Monitoring", False, error="Unexpected response format")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Ride Monitoring", False, error=f"HTTP {status}")
            return False

    def test_admin_user_monitoring(self):
        """Test admin can monitor all users"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin User Monitoring", False, error="No admin token available")
            return False
        
        response = self.make_request('GET', '/api/admin/users', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                user_count = len(data)
                self.log_test("Admin User Monitoring", True, 
                            f"Admin can see {user_count} users")
                
                # Check if our test users are visible
                our_users = [self.users['rider']['id'], self.users['driver']['id'], self.users['admin']['id']]
                found_users = 0
                
                for user in data:
                    if user.get('id') in our_users:
                        found_users += 1
                
                if found_users == 3:
                    self.log_test("Admin Can See Our Test Users", True, 
                                "Admin can see all our test users")
                else:
                    self.log_test("Admin Can See Our Test Users", False, 
                                error=f"Admin can only see {found_users}/3 of our test users")
                    return False
                
                return True
            else:
                self.log_test("Admin User Monitoring", False, error="Response is not a list")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin User Monitoring", False, error=f"HTTP {status}")
            return False

    def test_admin_statistics(self):
        """Test admin statistics endpoint"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Statistics", False, error="No admin token available")
            return False
        
        response = self.make_request('GET', '/api/admin/stats', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            expected_keys = ['total_users', 'total_drivers', 'total_riders', 'total_rides', 'completed_rides']
            if all(key in data for key in expected_keys):
                self.log_test("Admin Statistics", True, 
                            f"Users: {data['total_users']}, Rides: {data['total_rides']}, "
                            f"Completed: {data['completed_rides']}, Revenue: ${data.get('total_revenue', 0):.2f}")
                return True
            else:
                missing_keys = [key for key in expected_keys if key not in data]
                self.log_test("Admin Statistics", False, 
                            error=f"Missing keys: {missing_keys}")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Statistics", False, error=f"HTTP {status}")
            return False

    def test_audit_logging(self):
        """Test audit logging for all operations"""
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Audit Logging", False, error="No admin token available")
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
                user_logs = [log for log in data if 'user' in log.get('entity_type', '').lower() or 
                           'user' in log.get('action', '').lower()]
                
                self.log_test("Audit Logging", True, 
                            f"Found {len(data)} total audit logs, "
                            f"{len(ride_logs)} ride-related, "
                            f"{len(payment_logs)} payment-related, "
                            f"{len(user_logs)} user-related")
                
                # Store audit data for verification
                self.audit_data['total_logs'] = len(data)
                self.audit_data['ride_logs'] = len(ride_logs)
                self.audit_data['payment_logs'] = len(payment_logs)
                self.audit_data['user_logs'] = len(user_logs)
                
                return True
            else:
                self.log_test("Audit Logging", False, error="Response is not a list")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Audit Logging", False, error=f"HTTP {status}")
            return False

    def test_driver_ride_history(self):
        """Test driver can see their ride history"""
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Ride History", False, error="No driver token available")
            return False
        
        response = self.make_request('GET', '/api/rides/my-rides', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                ride_count = len(data)
                self.log_test("Driver Ride History", True, 
                            f"Driver can see {ride_count} rides in their history")
                
                # Check if our completed ride is in the history
                match_id = self.ride_data.get('match_id')
                our_ride_found = False
                
                for ride in data:
                    if ride.get('id') == match_id:
                        our_ride_found = True
                        break
                
                if our_ride_found:
                    self.log_test("Driver Can See Our Completed Ride", True, 
                                "Driver can see our completed ride in their history")
                else:
                    self.log_test("Driver Can See Our Completed Ride", False, 
                                error="Driver cannot see our completed ride in their history")
                    return False
                
                return True
            else:
                self.log_test("Driver Ride History", False, error="Response is not a list")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Ride History", False, error=f"HTTP {status}")
            return False

    def test_rider_ride_history(self):
        """Test rider can see their ride history"""
        token = self.tokens.get('rider')
        if not token:
            self.log_test("Rider Ride History", False, error="No rider token available")
            return False
        
        response = self.make_request('GET', '/api/rides/my-requests', auth_token=token)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'completed_rides' in data:
                completed_rides = data['completed_rides']
                ride_count = len(completed_rides)
                self.log_test("Rider Ride History", True, 
                            f"Rider can see {ride_count} rides in their history")
                
                # Check if our completed ride is in the history
                request_id = self.ride_data.get('request_id')
                our_ride_found = False
                
                for ride in completed_rides:
                    if ride.get('ride_request_id') == request_id:
                        our_ride_found = True
                        break
                
                if our_ride_found:
                    self.log_test("Rider Can See Our Completed Ride", True, 
                                "Rider can see our completed ride in their history")
                else:
                    self.log_test("Rider Can See Our Completed Ride", False, 
                                error="Rider cannot see our completed ride in their history")
                    return False
                
                return True
            else:
                self.log_test("Rider Ride History", False, error="Response is not a dict with completed_rides")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Rider Ride History", False, error=f"HTTP {status}")
            return False

    def test_payment_summary_driver(self):
        """Test driver payment summary"""
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

    def test_payment_summary_admin(self):
        """Test admin payment summary"""
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

    def run_comprehensive_ride_lifecycle_test(self):
        """Run comprehensive ride lifecycle test"""
        print("🚀 Starting Comprehensive Ride Lifecycle Test")
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
        
        # Ride Creation Phase
        print("\n🚗 RIDE CREATION PHASE")
        print("-" * 40)
        self.test_ride_request_creation()
        self.test_ride_request_status_pending()
        
        # Driver Processing Phase
        print("\n👨‍💼 DRIVER PROCESSING PHASE")
        print("-" * 40)
        self.test_driver_available_rides()
        self.test_ride_acceptance()
        self.test_ride_status_accepted()
        self.test_driver_arrival()
        self.test_ride_start()
        self.test_ride_completion()
        self.test_ride_status_completed()
        
        # Payment Processing Phase
        print("\n💳 PAYMENT PROCESSING PHASE")
        print("-" * 40)
        self.test_payment_processing()
        self.test_payment_summary_driver()
        self.test_payment_summary_admin()
        
        # Admin Monitoring Phase
        print("\n👑 ADMIN MONITORING PHASE")
        print("-" * 40)
        self.test_admin_ride_monitoring()
        self.test_admin_user_monitoring()
        self.test_admin_statistics()
        self.test_audit_logging()
        
        # User History Phase
        print("\n📚 USER HISTORY PHASE")
        print("-" * 40)
        self.test_driver_ride_history()
        self.test_rider_ride_history()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE RIDE LIFECYCLE TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 ALL COMPREHENSIVE RIDE LIFECYCLE TESTS PASSED!")
            print("✅ Complete ride lifecycle from creation to completion is working correctly.")
            print("✅ All user roles can properly interact with the system.")
            print("✅ Admin monitoring and audit logging are functioning.")
            print("✅ Payment processing is working end-to-end.")
            return True
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} tests failed.")
            print("❌ Some issues found in the ride lifecycle system.")
            return False

def main():
    """Main test execution"""
    tester = ComprehensiveRideLifecycleTester()
    success = tester.run_comprehensive_ride_lifecycle_test()
    
    # Save detailed results
    with open('comprehensive_ride_lifecycle_test_results.json', 'w') as f:
        json.dump({
            'test_type': 'comprehensive_ride_lifecycle',
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
                'audit_data': tester.audit_data,
                'users': {k: v for k, v in tester.users.items()}  # Exclude sensitive token data
            }
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())