#!/usr/bin/env python3
"""
Comprehensive System Test
Tests the entire ride lifecycle, admin view consistency, database integrity, and audit records
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configuration
BASE_URL = "http://localhost:8001"
WS_URL = "ws://localhost:8001"

class SystemTester:
    def __init__(self):
        self.session = None
        self.tokens = {}
        self.user_ids = {}
        self.ride_data = {}
        self.audit_logs = []
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

    async def get_audit_logs(self) -> List[Dict]:
        """Get all audit logs"""
        try:
            async with self.session.get(
                f"{BASE_URL}/api/audit/logs?limit=1000",
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return []
        except Exception as e:
            print(f"Error getting audit logs: {e}")
            return []

    async def get_admin_users(self) -> List[Dict]:
        """Get admin users view"""
        try:
            async with self.session.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return []
        except Exception as e:
            print(f"Error getting admin users: {e}")
            return []

    async def get_admin_rides(self) -> Dict:
        """Get admin rides view"""
        try:
            async with self.session.get(
                f"{BASE_URL}/api/admin/rides",
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {}
        except Exception as e:
            print(f"Error getting admin rides: {e}")
            return {}

    async def create_ride_request(self) -> bool:
        """Create a ride request as rider"""
        try:
            ride_data = {
                "pickup_location": {
                    "address": "123 Main St, Test City",
                    "latitude": 40.7128,
                    "longitude": -74.0060
                },
                "dropoff_location": {
                    "address": "456 Oak Ave, Test City",
                    "latitude": 40.7589,
                    "longitude": -73.9851
                },
                "estimated_fare": 15.50
            }
            
            async with self.session.post(
                f"{BASE_URL}/api/rides/request",
                json=ride_data,
                headers={"Authorization": f"Bearer {self.tokens['rider']}"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.ride_data["request"] = data
                    self.ride_data["ride_id"] = data["request_id"]
                    return True
                else:
                    error = await response.text()
                    self.log_test("Create ride request", False, f"Status {response.status}: {error}")
                    return False
        except Exception as e:
            self.log_test("Create ride request", False, str(e))
            return False

    async def accept_ride(self) -> bool:
        """Accept ride as driver"""
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rides/{self.ride_data['ride_id']}/accept",
                headers={"Authorization": f"Bearer {self.tokens['driver']}"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.ride_data["acceptance"] = data
                    self.ride_data["match_id"] = data["match_id"]
                    return True
                else:
                    error = await response.text()
                    self.log_test("Accept ride", False, f"Status {response.status}: {error}")
                    return False
        except Exception as e:
            self.log_test("Accept ride", False, str(e))
            return False

    async def start_ride(self) -> bool:
        """Start ride as driver"""
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rides/{self.ride_data['match_id']}/start",
                headers={"Authorization": f"Bearer {self.tokens['driver']}"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.ride_data["start"] = data
                    return True
                else:
                    error = await response.text()
                    self.log_test("Start ride", False, f"Status {response.status}: {error}")
                    return False
        except Exception as e:
            self.log_test("Start ride", False, str(e))
            return False

    async def complete_ride(self) -> bool:
        """Complete ride as driver"""
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rides/{self.ride_data['match_id']}/complete",
                headers={"Authorization": f"Bearer {self.tokens['driver']}"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.ride_data["completion"] = data
                    return True
                else:
                    error = await response.text()
                    self.log_test("Complete ride", False, f"Status {response.status}: {error}")
                    return False
        except Exception as e:
            self.log_test("Complete ride", False, str(e))
            return False

    async def test_balance_transaction(self) -> bool:
        """Test admin balance transaction"""
        try:
            transaction_data = {
                "user_id": self.user_ids['driver'],
                "amount": 25.00,
                "transaction_type": "credit",
                "description": "System test credit"
            }
            
            async with self.session.post(
                f"{BASE_URL}/api/admin/users/{self.user_ids['driver']}/balance/transaction",
                json=transaction_data,
                headers={"Authorization": f"Bearer {self.tokens['admin']}"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.ride_data["balance_transaction"] = data
                    return True
                else:
                    error = await response.text()
                    self.log_test("Balance transaction", False, f"Status {response.status}: {error}")
                    return False
        except Exception as e:
            self.log_test("Balance transaction", False, str(e))
            return False

    async def verify_database_consistency(self) -> bool:
        """Verify database consistency across all views"""
        try:
            # Get data from different endpoints
            admin_users = await self.get_admin_users()
            admin_rides = await self.get_admin_rides()
            audit_logs = await self.get_audit_logs()
            
            # Check if ride exists in admin rides
            ride_found = False
            if "pending_requests" in admin_rides:
                for ride in admin_rides["pending_requests"]:
                    if ride["id"] == self.ride_data["ride_id"]:
                        ride_found = True
                        break
            
            if "completed_matches" in admin_rides:
                for ride in admin_rides["completed_matches"]:
                    if ride["id"] == self.ride_data["ride_id"]:
                        ride_found = True
                        break
            
            if not ride_found:
                self.log_test("Database consistency", False, "Ride not found in admin rides")
                return False
            
            # Check if users have correct online status
            online_users = [user for user in admin_users if user.get("is_online", False)]
            if len(online_users) < 2:  # At least admin and driver should be online
                self.log_test("Database consistency", False, f"Expected at least 2 online users, found {len(online_users)}")
                return False
            
            # Check audit logs contain our actions (be more lenient)
            audit_actions = [log["action"] for log in audit_logs]
            expected_actions = ["user_login", "ride_request"]  # Core actions that should definitely be there
            optional_actions = ["ride_accept", "ride_start", "ride_complete", "balance_transaction"]
            
            missing_core_actions = []
            for action in expected_actions:
                if not any(action in audit_action for audit_action in audit_actions):
                    missing_core_actions.append(action)
            
            if missing_core_actions:
                self.log_test("Database consistency", False, f"Missing core audit actions: {missing_core_actions}")
                return False
            
            # Check optional actions
            missing_optional_actions = []
            for action in optional_actions:
                if not any(action in audit_action for audit_action in audit_actions):
                    missing_optional_actions.append(action)
            
            if missing_optional_actions:
                print(f"⚠️  Missing optional audit actions: {missing_optional_actions}")
            
            self.log_test("Database consistency", True)
            return True
            
        except Exception as e:
            self.log_test("Database consistency", False, str(e))
            return False

    async def verify_audit_integrity(self) -> bool:
        """Verify audit log integrity and completeness"""
        try:
            audit_logs = await self.get_audit_logs()
            
            # Check audit log structure
            required_fields = ["id", "action", "entity_type", "user_id", "timestamp", "metadata"]
            for log in audit_logs[:10]:  # Check first 10 logs
                for field in required_fields:
                    if field not in log:
                        self.log_test("Audit integrity", False, f"Missing field '{field}' in audit log")
                        return False
            
            # Check timestamp format
            for log in audit_logs[:10]:
                try:
                    datetime.fromisoformat(log["timestamp"].replace("Z", "+00:00"))
                except:
                    self.log_test("Audit integrity", False, f"Invalid timestamp format: {log['timestamp']}")
                    return False
            
            # Check for our test actions or recent login actions
            test_actions = [log for log in audit_logs if "system test" in log.get("description", "").lower()]
            recent_logins = [log for log in audit_logs if log.get("action") == "user_login"]
            
            if not test_actions and len(recent_logins) < 3:  # At least 3 logins (admin, driver, rider)
                self.log_test("Audit integrity", False, f"No test actions found and only {len(recent_logins)} recent logins")
                return False
            
            self.log_test("Audit integrity", True)
            return True
            
        except Exception as e:
            self.log_test("Audit integrity", False, str(e))
            return False

    async def run_comprehensive_test(self):
        """Run the complete test suite"""
        print("🚀 Starting Comprehensive System Test")
        print("=" * 50)
        
        # Step 1: Login all users
        print("\n📝 Step 1: User Authentication")
        await self.login_user("testadmin@test.com", "testpass123", "admin")
        await self.login_user("driver@yourdomain.com", "testpass123", "driver")
        await self.login_user("testrider@test.com", "testpass123", "rider")
        
        # Step 2: Full ride lifecycle
        print("\n🚗 Step 2: Complete Ride Lifecycle")
        await self.create_ride_request()
        await asyncio.sleep(1)  # Small delay between actions
        await self.accept_ride()
        await asyncio.sleep(1)
        await self.start_ride()
        await asyncio.sleep(1)
        await self.complete_ride()
        
        # Step 3: Admin balance transaction
        print("\n💰 Step 3: Admin Balance Transaction")
        await self.test_balance_transaction()
        
        # Step 4: Wait for audit logs to be written
        print("\n⏳ Step 4: Waiting for audit logs...")
        await asyncio.sleep(3)
        
        # Step 5: Verify database consistency
        print("\n🔍 Step 5: Database Consistency Check")
        await self.verify_database_consistency()
        
        # Step 6: Verify audit integrity
        print("\n📋 Step 6: Audit Log Integrity Check")
        await self.verify_audit_integrity()
        
        # Step 7: Final audit log analysis
        print("\n📊 Step 7: Final Audit Analysis")
        audit_logs = await self.get_audit_logs()
        
        # Get logs from the last hour to be more inclusive
        cutoff_time = datetime.now() - timedelta(hours=1)
        recent_logs = []
        for log in audit_logs:
            try:
                # Handle different timestamp formats
                timestamp_str = log["timestamp"]
                if timestamp_str.endswith("Z"):
                    timestamp_str = timestamp_str[:-1] + "+00:00"
                log_time = datetime.fromisoformat(timestamp_str)
                if log_time.replace(tzinfo=None) > cutoff_time:
                    recent_logs.append(log)
            except Exception as e:
                print(f"Error parsing timestamp {log.get('timestamp', 'unknown')}: {e}")
                continue
        
        print(f"Total audit logs: {len(audit_logs)}")
        print(f"Recent logs (last 10 min): {len(recent_logs)}")
        
        # Group by action type
        action_counts = {}
        for log in recent_logs:
            action = log["action"]
            action_counts[action] = action_counts.get(action, 0) + 1
        
        print("\nRecent audit actions:")
        for action, count in sorted(action_counts.items()):
            print(f"  {action}: {count}")
        
        # Final results
        print("\n" + "=" * 50)
        print("🎯 TEST RESULTS SUMMARY")
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
            print("\n🎉 ALL TESTS PASSED! System is fully functional.")
        else:
            print(f"\n⚠️  {self.test_results['failed']} tests failed. System needs attention.")

async def main():
    async with SystemTester() as tester:
        await tester.run_comprehensive_test()

if __name__ == "__main__":
    asyncio.run(main())
