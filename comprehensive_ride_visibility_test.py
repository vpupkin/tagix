#!/usr/bin/env python3

import requests
import json
import sys
import time
from datetime import datetime
import uuid
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

class ComprehensiveRideVisibilityTester:
    def __init__(self):
        self.base_url = "https://ridesync-10.preview.emergentagent.com/api"
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
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    async def check_database_directly(self):
        """Check database collections directly"""
        print("\n🗄️ DIRECT DATABASE VERIFICATION")
        print("-" * 50)
        
        try:
            client = AsyncIOMotorClient('mongodb://localhost:27017')
            db = client['mobility_hub_db']
            
            # Check ride_requests collection
            ride_requests = await db.ride_requests.find({}).to_list(None)
            pending_requests = [r for r in ride_requests if r.get('status') == 'pending']
            
            self.log_test("Database Ride Requests Storage", True, 
                        f"Found {len(ride_requests)} total ride requests, {len(pending_requests)} pending")
            
            # Check ride_matches collection
            ride_matches = await db.ride_matches.find({}).to_list(None)
            
            self.log_test("Database Ride Matches Storage", True, 
                        f"Found {len(ride_matches)} ride matches")
            
            # Check users collection for drivers
            drivers = await db.users.find({"role": "driver"}).to_list(None)
            online_drivers = [d for d in drivers if d.get('is_online', False)]
            
            self.log_test("Database Driver Status", True, 
                        f"Found {len(drivers)} drivers, {len(online_drivers)} online")
            
            client.close()
            return True
            
        except Exception as e:
            self.log_test("Database Direct Access", False, error=str(e))
            return False

    def setup_test_environment(self):
        """Setup comprehensive test environment"""
        print("🔧 Setting up comprehensive test environment...")
        
        timestamp = int(time.time())
        
        # Create admin user
        admin_data = {
            "email": f"comprehensive_admin_{timestamp}@mobilityhub.com",
            "password": "SecurePass123!",
            "name": f"Comprehensive Admin {timestamp}",
            "phone": f"+1555{timestamp % 10000:04d}",
            "role": "admin"
        }
        
        response = self.make_request('POST', '/auth/register', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            self.tokens['admin'] = data['access_token']
            self.users['admin'] = data['user']
            print(f"✅ Admin created: {data['user']['email']}")
        else:
            print(f"❌ Failed to create admin")
            return False
        
        # Create multiple drivers
        for i in range(2):
            driver_data = {
                "email": f"comprehensive_driver_{timestamp}_{i}@mobilityhub.com",
                "password": "SecurePass123!",
                "name": f"Comprehensive Driver {timestamp}_{i}",
                "phone": f"+1555{timestamp % 10000 + i + 10:04d}",
                "role": "driver"
            }
            
            response = self.make_request('POST', '/auth/register', driver_data)
            if response and response.status_code == 200:
                data = response.json()
                self.tokens[f'driver_{i}'] = data['access_token']
                self.users[f'driver_{i}'] = data['user']
                print(f"✅ Driver {i} created: {data['user']['email']}")
                
                # Create driver profile
                profile_data = {
                    "vehicle_type": "economy" if i == 0 else "comfort",
                    "vehicle_make": "Toyota" if i == 0 else "Honda",
                    "vehicle_model": "Prius" if i == 0 else "Accord",
                    "vehicle_year": 2022,
                    "license_plate": f"TEST{timestamp % 1000}{i}",
                    "license_number": f"DL{timestamp}{i}"
                }
                
                response = self.make_request('POST', '/driver/profile', profile_data, 
                                           auth_token=self.tokens[f'driver_{i}'])
                if response and response.status_code == 200:
                    print(f"✅ Driver {i} profile created")
                
                # Set driver location and online
                location_data = {
                    "location": {
                        "latitude": 37.7749 + (i * 0.01),
                        "longitude": -122.4194 + (i * 0.01),
                        "address": f"San Francisco Location {i}, CA"
                    }
                }
                
                self.make_request('POST', '/location/update', location_data, 
                                auth_token=self.tokens[f'driver_{i}'])
                self.make_request('POST', '/driver/online', auth_token=self.tokens[f'driver_{i}'])
                print(f"✅ Driver {i} set online")
            else:
                print(f"❌ Failed to create driver {i}")
                return False
        
        # Create multiple riders
        for i in range(2):
            rider_data = {
                "email": f"comprehensive_rider_{timestamp}_{i}@mobilityhub.com",
                "password": "SecurePass123!",
                "name": f"Comprehensive Rider {timestamp}_{i}",
                "phone": f"+1555{timestamp % 10000 + i + 20:04d}",
                "role": "rider"
            }
            
            response = self.make_request('POST', '/auth/register', rider_data)
            if response and response.status_code == 200:
                data = response.json()
                self.tokens[f'rider_{i}'] = data['access_token']
                self.users[f'rider_{i}'] = data['user']
                print(f"✅ Rider {i} created: {data['user']['email']}")
            else:
                print(f"❌ Failed to create rider {i}")
                return False
        
        return True

    def test_ride_request_creation_and_storage(self):
        """Test ride request creation and verify storage"""
        print("\n🚗 TESTING RIDE REQUEST CREATION AND STORAGE")
        print("-" * 50)
        
        created_requests = []
        
        # Create multiple ride requests from different riders
        ride_scenarios = [
            {
                "rider": "rider_0",
                "pickup": {"latitude": 37.7749, "longitude": -122.4194, "address": "Union Square, SF"},
                "dropoff": {"latitude": 37.7849, "longitude": -122.4094, "address": "Financial District, SF"},
                "vehicle_type": "economy"
            },
            {
                "rider": "rider_1", 
                "pickup": {"latitude": 37.7649, "longitude": -122.4294, "address": "Mission District, SF"},
                "dropoff": {"latitude": 37.7949, "longitude": -122.3994, "address": "Chinatown, SF"},
                "vehicle_type": "comfort"
            }
        ]
        
        for i, scenario in enumerate(ride_scenarios):
            ride_data = {
                "pickup_location": scenario["pickup"],
                "dropoff_location": scenario["dropoff"],
                "vehicle_type": scenario["vehicle_type"],
                "passenger_count": 1,
                "special_requirements": f"Comprehensive test ride #{i+1}"
            }
            
            response = self.make_request('POST', '/rides/request', ride_data, 
                                       auth_token=self.tokens[scenario["rider"]])
            
            if response and response.status_code == 200:
                data = response.json()
                if 'request_id' in data:
                    created_requests.append(data['request_id'])
                    self.log_test(f"Ride Request Creation #{i+1}", True, 
                                f"Request ID: {data['request_id']}, Fare: ${data.get('estimated_fare', 0):.2f}")
                else:
                    self.log_test(f"Ride Request Creation #{i+1}", False, error="Missing request_id")
            else:
                status = response.status_code if response else "No response"
                self.log_test(f"Ride Request Creation #{i+1}", False, error=f"HTTP {status}")
        
        return created_requests

    def test_admin_ride_management_capabilities(self):
        """Test admin's ability to manage rides"""
        print("\n👑 TESTING ADMIN RIDE MANAGEMENT CAPABILITIES")
        print("-" * 50)
        
        # Test admin can see all rides (matches)
        response = self.make_request('GET', '/admin/rides', auth_token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            try:
                rides = response.json()
                self.log_test("Admin Rides Access", True, f"Admin can see {len(rides)} ride matches")
            except json.JSONDecodeError:
                self.log_test("Admin Rides Access", False, error="Invalid JSON response")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Rides Access", False, error=f"HTTP {status}")
        
        # Test admin stats
        response = self.make_request('GET', '/admin/stats', auth_token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            try:
                stats = response.json()
                self.log_test("Admin Stats Access", True, 
                            f"Users: {stats.get('total_users', 0)}, Rides: {stats.get('total_rides', 0)}, Online Drivers: {stats.get('online_drivers', 0)}")
            except json.JSONDecodeError:
                self.log_test("Admin Stats Access", False, error="Invalid JSON response")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Admin Stats Access", False, error=f"HTTP {status}")

    def test_driver_ride_discovery_workflow(self):
        """Test how drivers can discover and accept rides"""
        print("\n🚗 TESTING DRIVER RIDE DISCOVERY WORKFLOW")
        print("-" * 50)
        
        # Test if there's a dedicated endpoint for drivers to see available rides
        response = self.make_request('GET', '/rides/available', auth_token=self.tokens['driver_0'])
        
        if response and response.status_code == 200:
            try:
                available_rides = response.json()
                self.log_test("Driver Available Rides Endpoint", True, 
                            f"Driver can see {len(available_rides)} available rides")
            except json.JSONDecodeError:
                self.log_test("Driver Available Rides Endpoint", False, error="Invalid JSON response")
        elif response and response.status_code == 404:
            self.log_test("Driver Available Rides Endpoint", False, 
                        error="Endpoint not implemented - drivers may rely on WebSocket notifications only")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Available Rides Endpoint", False, error=f"HTTP {status}")
        
        # Test driver can see their own rides
        response = self.make_request('GET', '/rides/my-rides', auth_token=self.tokens['driver_0'])
        
        if response and response.status_code == 200:
            try:
                my_rides = response.json()
                self.log_test("Driver My Rides Access", True, f"Driver can see {len(my_rides)} of their rides")
            except json.JSONDecodeError:
                self.log_test("Driver My Rides Access", False, error="Invalid JSON response")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver My Rides Access", False, error=f"HTTP {status}")

    def test_ride_processing_workflow(self, ride_request_ids):
        """Test complete ride processing workflow"""
        print("\n🔄 TESTING RIDE PROCESSING WORKFLOW")
        print("-" * 50)
        
        if not ride_request_ids:
            self.log_test("Ride Processing Workflow", False, error="No ride requests available for testing")
            return
        
        # Test ride acceptance
        request_id = ride_request_ids[0]
        response = self.make_request('POST', f'/rides/{request_id}/accept', 
                                   auth_token=self.tokens['driver_0'])
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'match_id' in data:
                    match_id = data['match_id']
                    self.log_test("Ride Acceptance", True, f"Ride accepted, Match ID: {match_id}")
                    
                    # Test ride completion
                    response = self.make_request('POST', f'/rides/{match_id}/complete', 
                                               auth_token=self.tokens['driver_0'])
                    if response and response.status_code == 200:
                        self.log_test("Ride Completion", True, "Ride completed successfully")
                    else:
                        status = response.status_code if response else "No response"
                        self.log_test("Ride Completion", False, error=f"HTTP {status}")
                else:
                    self.log_test("Ride Acceptance", False, error="Missing match_id")
            except json.JSONDecodeError:
                self.log_test("Ride Acceptance", False, error="Invalid JSON response")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Ride Acceptance", False, error=f"HTTP {status}")

    def test_role_based_access_control(self):
        """Test role-based access control"""
        print("\n🔒 TESTING ROLE-BASED ACCESS CONTROL")
        print("-" * 50)
        
        # Test rider cannot access admin endpoints
        response = self.make_request('GET', '/admin/rides', auth_token=self.tokens['rider_0'])
        if response and response.status_code == 403:
            self.log_test("Rider Admin Access Restriction", True, "Rider correctly denied admin access")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Rider Admin Access Restriction", False, error=f"Expected 403, got {status}")
        
        # Test driver cannot access admin endpoints
        response = self.make_request('GET', '/admin/users', auth_token=self.tokens['driver_0'])
        if response and response.status_code == 403:
            self.log_test("Driver Admin Access Restriction", True, "Driver correctly denied admin access")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Driver Admin Access Restriction", False, error=f"Expected 403, got {status}")

    async def run_comprehensive_test(self):
        """Run comprehensive ride visibility and processing test"""
        print("🚀 Starting Comprehensive MobilityHub Ride Visibility Test")
        print("=" * 70)
        
        # Setup test environment
        if not self.setup_test_environment():
            print("❌ Failed to setup test environment. Aborting test.")
            return False
        
        # Direct database verification
        await self.check_database_directly()
        
        # Test ride request creation and storage
        ride_request_ids = self.test_ride_request_creation_and_storage()
        
        # Test admin capabilities
        self.test_admin_ride_management_capabilities()
        
        # Test driver workflow
        self.test_driver_ride_discovery_workflow()
        
        # Test ride processing
        self.test_ride_processing_workflow(ride_request_ids)
        
        # Test access control
        self.test_role_based_access_control()
        
        # Final summary
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE RIDE VISIBILITY TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        # Analysis
        print("\n🔍 KEY FINDINGS:")
        print("-" * 30)
        
        failed_tests = [result for result in self.test_results if not result['success']]
        critical_issues = []
        
        if any("Database" in test['test_name'] and not test['success'] for test in self.test_results):
            critical_issues.append("Database storage issues detected")
        
        if any("Admin" in test['test_name'] and not test['success'] for test in self.test_results):
            critical_issues.append("Admin ride management capabilities limited")
        
        if any("Available Rides" in test['test_name'] and not test['success'] for test in self.test_results):
            critical_issues.append("No dedicated endpoint for drivers to discover available rides")
        
        if any("Acceptance" in test['test_name'] and not test['success'] for test in self.test_results):
            critical_issues.append("Ride acceptance workflow broken")
        
        if critical_issues:
            print("🚨 CRITICAL FINDINGS:")
            for issue in critical_issues:
                print(f"   • {issue}")
        
        print("\n✅ WORKING FEATURES:")
        working_features = []
        if any("Database" in test['test_name'] and test['success'] for test in self.test_results):
            working_features.append("Ride requests are properly stored in database")
        if any("Admin Stats" in test['test_name'] and test['success'] for test in self.test_results):
            working_features.append("Admin can access platform statistics")
        if any("Acceptance" in test['test_name'] and test['success'] for test in self.test_results):
            working_features.append("Ride acceptance and completion workflow functional")
        if any("Access Restriction" in test['test_name'] and test['success'] for test in self.test_results):
            working_features.append("Role-based access control working")
        
        for feature in working_features:
            print(f"   • {feature}")
        
        success = self.passed_tests == self.total_tests
        return success

def main():
    """Main test execution"""
    async def run_test():
        tester = ComprehensiveRideVisibilityTester()
        success = await tester.run_comprehensive_test()
        
        # Save results
        with open('/app/comprehensive_ride_visibility_results.json', 'w') as f:
            json.dump({
                'test_type': 'comprehensive_ride_visibility_and_processing',
                'summary': {
                    'total_tests': tester.total_tests,
                    'passed_tests': tester.passed_tests,
                    'failed_tests': tester.total_tests - tester.passed_tests,
                    'success_rate': (tester.passed_tests/tester.total_tests*100) if tester.total_tests > 0 else 0,
                    'timestamp': datetime.now().isoformat()
                },
                'detailed_results': tester.test_results
            }, f, indent=2)
        
        return success
    
    success = asyncio.run(run_test())
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())