#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

class RideVisibilityTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.test_results = []
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()
        
        self.test_results.append({
            "test_name": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        })
    
    def create_test_users(self):
        """Create test users for all roles"""
        print("🔧 Creating test users for all roles...")
        timestamp = int(time.time())
        
        # Create admin
        admin_data = {
            "email": f"admin_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Admin {timestamp}",
            "phone": f"+1555{timestamp % 10000:04d}",
            "role": "admin"
        }
        
        response = self.session.post(f"{self.base_url}/api/auth/register", json=admin_data)
        if response.status_code == 200:
            data = response.json()
            self.tokens['admin'] = data['access_token']
            self.users['admin'] = data['user']
            self.log_test("Admin Creation", True, f"Admin ID: {data['user']['id']}")
        else:
            self.log_test("Admin Creation", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
        
        # Create driver
        driver_data = {
            "email": f"driver_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Driver {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 1:04d}",
            "role": "driver"
        }
        
        response = self.session.post(f"{self.base_url}/api/auth/register", json=driver_data)
        if response.status_code == 200:
            data = response.json()
            self.tokens['driver'] = data['access_token']
            self.users['driver'] = data['user']
            self.log_test("Driver Creation", True, f"Driver ID: {data['user']['id']}")
        else:
            self.log_test("Driver Creation", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
        
        # Create rider
        rider_data = {
            "email": f"rider_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Rider {timestamp}",
            "phone": f"+1555{timestamp % 10000 + 2:04d}",
            "role": "rider"
        }
        
        response = self.session.post(f"{self.base_url}/api/auth/register", json=rider_data)
        if response.status_code == 200:
            data = response.json()
            self.tokens['rider'] = data['access_token']
            self.users['rider'] = data['user']
            self.log_test("Rider Creation", True, f"Rider ID: {data['user']['id']}")
        else:
            self.log_test("Rider Creation", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
        
        return True
    
    def setup_driver(self):
        """Setup driver profile and location"""
        print("🔧 Setting up driver...")
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Setup", False, error="No driver token")
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
        
        response = self.session.post(f"{self.base_url}/api/driver/profile", 
                                   json=profile_data,
                                   headers={'Authorization': f'Bearer {token}'})
        if response.status_code != 200:
            self.log_test("Driver Profile", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
        
        # Set location
        location_data = {
            "location": {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "address": "San Francisco, CA"
            }
        }
        
        response = self.session.post(f"{self.base_url}/api/location/update", 
                                   json=location_data,
                                   headers={'Authorization': f'Bearer {token}'})
        if response.status_code != 200:
            self.log_test("Driver Location", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
        
        # Set online
        response = self.session.post(f"{self.base_url}/api/driver/online",
                                   headers={'Authorization': f'Bearer {token}'})
        if response.status_code != 200:
            self.log_test("Driver Online", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
        
        self.log_test("Driver Setup Complete", True, "Driver is online and ready")
        return True
    
    def test_admin_ride_visibility(self):
        """Test admin can see all rides"""
        print("👑 Testing Admin Ride Visibility...")
        token = self.tokens.get('admin')
        if not token:
            self.log_test("Admin Ride Visibility", False, error="No admin token")
            return False
        
        # Test admin rides endpoint
        response = self.session.get(f"{self.base_url}/api/admin/rides",
                                  headers={'Authorization': f'Bearer {token}'})
        
        if response.status_code == 200:
            data = response.json()
            pending_count = len(data.get('pending_requests', []))
            completed_count = len(data.get('completed_matches', []))
            total_pending = data.get('total_pending', 0)
            total_completed = data.get('total_completed', 0)
            
            self.log_test("Admin Ride Visibility", True, 
                         f"Pending: {pending_count}, Completed: {completed_count}, "
                         f"Total Pending: {total_pending}, Total Completed: {total_completed}")
            
            # Test admin stats
            response = self.session.get(f"{self.base_url}/api/admin/stats",
                                      headers={'Authorization': f'Bearer {token}'})
            if response.status_code == 200:
                stats = response.json()
                self.log_test("Admin Stats", True, 
                             f"Users: {stats.get('total_users', 0)}, "
                             f"Rides: {stats.get('total_rides', 0)}, "
                             f"Revenue: ${stats.get('total_revenue', 0):.2f}")
            else:
                self.log_test("Admin Stats", False, error=f"HTTP {response.status_code}")
            
            return True
        else:
            self.log_test("Admin Ride Visibility", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_driver_ride_visibility(self):
        """Test driver can see available rides"""
        print("🚗 Testing Driver Ride Visibility...")
        token = self.tokens.get('driver')
        if not token:
            self.log_test("Driver Ride Visibility", False, error="No driver token")
            return False
        
        # Test available rides endpoint
        response = self.session.get(f"{self.base_url}/api/rides/available",
                                  headers={'Authorization': f'Bearer {token}'})
        
        if response.status_code == 200:
            data = response.json()
            available_count = len(data.get('available_rides', []))
            total_available = data.get('total_available', 0)
            total_pending = data.get('total_pending', 0)
            
            self.log_test("Driver Available Rides", True, 
                         f"Available: {available_count}, Total Available: {total_available}, "
                         f"Total Pending: {total_pending}")
            
            # Test driver's own rides
            response = self.session.get(f"{self.base_url}/api/rides/my-rides",
                                      headers={'Authorization': f'Bearer {token}'})
            if response.status_code == 200:
                rides = response.json()
                self.log_test("Driver My Rides", True, f"Driver has {len(rides)} rides")
            else:
                self.log_test("Driver My Rides", False, error=f"HTTP {response.status_code}")
            
            return True
        else:
            self.log_test("Driver Available Rides", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
    
    def test_rider_ride_visibility(self):
        """Test rider can see their rides"""
        print("🚶 Testing Rider Ride Visibility...")
        token = self.tokens.get('rider')
        if not token:
            self.log_test("Rider Ride Visibility", False, error="No rider token")
            return False
        
        # Test rider's rides
        response = self.session.get(f"{self.base_url}/api/rides/my-rides",
                                  headers={'Authorization': f'Bearer {token}'})
        
        if response.status_code == 200:
            rides = response.json()
            self.log_test("Rider My Rides", True, f"Rider has {len(rides)} rides")
            
            # Test rider's requests
            response = self.session.get(f"{self.base_url}/api/rides/my-requests",
                                      headers={'Authorization': f'Bearer {token}'})
            if response.status_code == 200:
                data = response.json()
                pending_count = len(data.get('pending_requests', []))
                completed_count = len(data.get('completed_rides', []))
                self.log_test("Rider My Requests", True, 
                             f"Pending: {pending_count}, Completed: {completed_count}")
            else:
                self.log_test("Rider My Requests", False, error=f"HTTP {response.status_code}")
            
            return True
        else:
            self.log_test("Rider My Rides", False, error=f"HTTP {response.status_code}: {response.text}")
            return False
    
    def create_test_ride(self):
        """Create a test ride request"""
        print("🚗 Creating test ride request...")
        token = self.tokens.get('rider')
        if not token:
            self.log_test("Test Ride Creation", False, error="No rider token")
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
            "special_requirements": "Test ride for visibility testing"
        }
        
        response = self.session.post(f"{self.base_url}/api/rides/request", 
                                   json=ride_data,
                                   headers={'Authorization': f'Bearer {token}'})
        
        if response.status_code == 200:
            data = response.json()
            self.log_test("Test Ride Creation", True, 
                         f"Request ID: {data.get('request_id', 'N/A')}, "
                         f"Fare: ${data.get('estimated_fare', 0):.2f}, "
                         f"Matches: {data.get('matches_found', 0)}")
            return data.get('request_id')
        else:
            self.log_test("Test Ride Creation", False, error=f"HTTP {response.status_code}: {response.text}")
            return None
    
    def run_comprehensive_test(self):
        """Run comprehensive ride visibility test"""
        print("🚀 Starting Comprehensive Ride Visibility Test")
        print("=" * 80)
        
        # Setup
        if not self.create_test_users():
            print("❌ Failed to create test users")
            return False
        
        if not self.setup_driver():
            print("❌ Failed to setup driver")
            return False
        
        # Create a test ride
        ride_id = self.create_test_ride()
        
        # Test all roles
        print("\n📊 TESTING RIDE VISIBILITY ACROSS ALL ROLES")
        print("-" * 50)
        
        admin_success = self.test_admin_ride_visibility()
        driver_success = self.test_driver_ride_visibility()
        rider_success = self.test_rider_ride_visibility()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE RIDE VISIBILITY TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        print(f"\nRole-specific Results:")
        print(f"  Admin Visibility: {'✅ PASS' if admin_success else '❌ FAIL'}")
        print(f"  Driver Visibility: {'✅ PASS' if driver_success else '❌ FAIL'}")
        print(f"  Rider Visibility: {'✅ PASS' if rider_success else '❌ FAIL'}")
        
        if passed_tests == total_tests:
            print("\n🎉 ALL RIDE VISIBILITY TESTS PASSED!")
            print("✅ All user roles can properly see ride data")
            print("✅ Backend is working correctly with real data")
            return True
        else:
            print(f"\n⚠️  {total_tests - passed_tests} tests failed.")
            print("❌ Some issues found in ride visibility system.")
            return False

def main():
    tester = RideVisibilityTester()
    success = tester.run_comprehensive_test()
    
    # Save results
    with open('ride_visibility_test_results.json', 'w') as f:
        json.dump({
            'test_type': 'comprehensive_ride_visibility',
            'summary': {
                'total_tests': len(tester.test_results),
                'passed_tests': sum(1 for r in tester.test_results if r['success']),
                'failed_tests': sum(1 for r in tester.test_results if not r['success']),
                'success_rate': (sum(1 for r in tester.test_results if r['success']) / len(tester.test_results) * 100) if tester.test_results else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results,
            'test_users': {k: {'id': v['id'], 'email': v['email'], 'role': v['role']} for k, v in tester.users.items()}
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
