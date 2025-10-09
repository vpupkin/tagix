#!/usr/bin/env python3
"""
Final System Verification
Comprehensive verification of all system components
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

BASE_URL = "http://localhost:8001"

class SystemVerifier:
    def __init__(self):
        self.session = None
        self.tokens = {}
        self.user_ids = {}
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        if success:
            self.test_results["passed"] += 1
            print(f"✅ {test_name}")
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {details}")
            print(f"❌ {test_name}: {details}")

    async def login_user(self, email: str, password: str, role: str) -> bool:
        """Login user and store token"""
        try:
            async with self.session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": email, "password": password}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.tokens[role] = data["access_token"]
                    self.user_ids[role] = data["user"]["id"]
                    return True
                else:
                    error = await response.text()
                    self.log_test(f"Login {role}", False, f"Status {response.status}: {error}")
                    return False
        except Exception as e:
            self.log_test(f"Login {role}", False, str(e))
            return False

    async def test_online_status(self) -> bool:
        """Test that online status is properly tracked"""
        try:
            # Get admin users to check online status
            async with self.session.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status == 200:
                    users = await response.json()
                    online_users = [user for user in users if user.get("is_online", False)]
                    
                    # Should have at least admin and driver online
                    if len(online_users) >= 2:
                        self.log_test("Online status tracking", True, f"{len(online_users)} users online")
                        return True
                    else:
                        self.log_test("Online status tracking", False, f"Only {len(online_users)} users online")
                        return False
                else:
                    self.log_test("Online status tracking", False, f"Failed to get users: {response.status}")
                    return False
        except Exception as e:
            self.log_test("Online status tracking", False, str(e))
            return False

    async def test_balance_system(self) -> bool:
        """Test balance system functionality"""
        try:
            # Test admin balance transaction
            transaction_data = {
                "user_id": self.user_ids['driver'],
                "amount": 10.00,
                "transaction_type": "credit",
                "description": "System verification test"
            }
            
            async with self.session.post(
                f"{BASE_URL}/api/admin/users/{self.user_ids['driver']}/balance/transaction",
                json=transaction_data,
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.log_test("Balance transaction", True, f"New balance: ${data['new_balance']}")
                    return True
                else:
                    error = await response.text()
                    self.log_test("Balance transaction", False, f"Status {response.status}: {error}")
                    return False
        except Exception as e:
            self.log_test("Balance transaction", False, str(e))
            return False

    async def test_ride_lifecycle(self) -> bool:
        """Test complete ride lifecycle"""
        try:
            # Create ride request
            ride_data = {
                "pickup_location": {
                    "address": "123 Test St, Test City",
                    "latitude": 40.7128,
                    "longitude": -74.0060
                },
                "dropoff_location": {
                    "address": "456 Test Ave, Test City",
                    "latitude": 40.7589,
                    "longitude": -73.9851
                },
                "estimated_fare": 12.50
            }
            
            async with self.session.post(
                f"{BASE_URL}/api/rides/request",
                json=ride_data,
                headers={"Authorization": f"Bearer {self.tokens['rider']}"}
            ) as response:
                if response.status != 200:
                    error = await response.text()
                    self.log_test("Ride request", False, f"Status {response.status}: {error}")
                    return False
                
                request_data = await response.json()
                ride_id = request_data["request_id"]
            
            # Accept ride
            async with self.session.post(
                f"{BASE_URL}/api/rides/{ride_id}/accept",
                headers={"Authorization": f"Bearer {self.tokens['driver']}"}
            ) as response:
                if response.status != 200:
                    error = await response.text()
                    self.log_test("Ride acceptance", False, f"Status {response.status}: {error}")
                    return False
                
                accept_data = await response.json()
                match_id = accept_data["match_id"]
            
            # Start ride
            async with self.session.post(
                f"{BASE_URL}/api/rides/{match_id}/start",
                headers={"Authorization": f"Bearer {self.tokens['driver']}"}
            ) as response:
                if response.status != 200:
                    error = await response.text()
                    self.log_test("Ride start", False, f"Status {response.status}: {error}")
                    return False
            
            # Complete ride
            async with self.session.post(
                f"{BASE_URL}/api/rides/{match_id}/complete",
                headers={"Authorization": f"Bearer {self.tokens['driver']}"}
            ) as response:
                if response.status != 200:
                    error = await response.text()
                    self.log_test("Ride completion", False, f"Status {response.status}: {error}")
                    return False
            
            self.log_test("Complete ride lifecycle", True, "All stages completed successfully")
            return True
            
        except Exception as e:
            self.log_test("Complete ride lifecycle", False, str(e))
            return False

    async def test_audit_system(self) -> bool:
        """Test audit system functionality"""
        try:
            # Get audit logs
            async with self.session.get(
                f"{BASE_URL}/api/audit/logs?limit=100",
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status != 200:
                    self.log_test("Audit system", False, f"Failed to get audit logs: {response.status}")
                    return False
                
                audit_logs = await response.json()
                
                # Check for key audit actions
                actions = [log.get("action", "") for log in audit_logs]
                required_actions = ["user_login", "ride_requested", "admin_system_config_changed"]
                
                missing_actions = []
                for action in required_actions:
                    if not any(action in audit_action for audit_action in actions):
                        missing_actions.append(action)
                
                if missing_actions:
                    self.log_test("Audit system", False, f"Missing audit actions: {missing_actions}")
                    return False
                
                self.log_test("Audit system", True, f"Found {len(audit_logs)} audit logs with all required actions")
                return True
                
        except Exception as e:
            self.log_test("Audit system", False, str(e))
            return False

    async def test_admin_dashboard_consistency(self) -> bool:
        """Test admin dashboard data consistency"""
        try:
            # Get admin dashboard data
            async with self.session.get(
                f"{BASE_URL}/api/admin/stats",
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status != 200:
                    self.log_test("Admin dashboard stats", False, f"Status {response.status}")
                    return False
                
                stats = await response.json()
            
            # Get users
            async with self.session.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status != 200:
                    self.log_test("Admin dashboard users", False, f"Status {response.status}")
                    return False
                
                users = await response.json()
            
            # Get rides
            async with self.session.get(
                f"{BASE_URL}/api/admin/rides",
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status != 200:
                    self.log_test("Admin dashboard rides", False, f"Status {response.status}")
                    return False
                
                rides = await response.json()
            
            # Verify consistency
            if stats["total_users"] != len(users):
                self.log_test("Admin dashboard consistency", False, 
                            f"User count mismatch: stats={stats['total_users']}, actual={len(users)}")
                return False
            
            self.log_test("Admin dashboard consistency", True, 
                         f"Stats: {stats['total_users']} users, {stats['total_rides']} rides")
            return True
            
        except Exception as e:
            self.log_test("Admin dashboard consistency", False, str(e))
            return False

    async def run_verification(self):
        """Run complete system verification"""
        print("🔍 FINAL SYSTEM VERIFICATION")
        print("=" * 50)
        
        # Step 1: Login all users
        print("\n📝 Step 1: User Authentication")
        await self.login_user("testadmin@test.com", "testpass123", "admin")
        await self.login_user("driver@yourdomain.com", "testpass123", "driver")
        await self.login_user("testrider@test.com", "testpass123", "rider")
        
        # Step 2: Test online status
        print("\n🌐 Step 2: Online Status Verification")
        await self.test_online_status()
        
        # Step 3: Test balance system
        print("\n💰 Step 3: Balance System Verification")
        await self.test_balance_system()
        
        # Step 4: Test ride lifecycle
        print("\n🚗 Step 4: Ride Lifecycle Verification")
        await self.test_ride_lifecycle()
        
        # Step 5: Test audit system
        print("\n📋 Step 5: Audit System Verification")
        await self.test_audit_system()
        
        # Step 6: Test admin dashboard consistency
        print("\n📊 Step 6: Admin Dashboard Consistency")
        await self.test_admin_dashboard_consistency()
        
        # Final results
        print("\n" + "=" * 50)
        print("🎯 VERIFICATION RESULTS")
        print("=" * 50)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n❌ ERRORS:")
            for error in self.test_results['errors']:
                print(f"  - {error}")
        
        success_rate = (self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed'])) * 100
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        if self.test_results['failed'] == 0:
            print("\n🎉 ALL VERIFICATIONS PASSED! System is fully functional and consistent.")
        else:
            print(f"\n⚠️  {self.test_results['failed']} verifications failed. System needs attention.")

async def main():
    async with SystemVerifier() as verifier:
        await verifier.run_verification()

if __name__ == "__main__":
    asyncio.run(main())
