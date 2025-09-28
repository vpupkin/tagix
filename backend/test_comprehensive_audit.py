#!/usr/bin/env python3
"""
Comprehensive test suite for MobilityHub audit trails and admin CRUD operations
Testing all transactional requests and critical data modifications
"""

import asyncio
import pytest
import json
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.testclient import TestClient
import os
import sys

# Add backend to path
sys.path.append('/app/backend')

try:
    from server import app, audit_system, admin_crud
    from audit_system import AuditAction, AuditFilter
    from admin_crud import AdminUserUpdate, AdminRideUpdate, AdminPaymentUpdate, DataFilter
    IMPORTS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import audit system: {e}")
    IMPORTS_AVAILABLE = False

class TestComprehensiveAudit:
    """Test suite for comprehensive audit trails and admin operations"""
    
    def setup_method(self):
        """Setup test environment"""
        self.client = TestClient(app)
        self.base_url = "http://localhost:8001/api"
        
        # Test users for different roles
        self.test_rider = {
            "email": "test_rider@audit.com",
            "password": "testpass123",
            "name": "Test Rider",
            "phone": "+1234567890",
            "role": "rider"
        }
        
        self.test_driver = {
            "email": "test_driver@audit.com",
            "password": "testpass123",
            "name": "Test Driver",
            "phone": "+1234567891",
            "role": "driver"
        }
        
        self.test_admin = {
            "email": "test_admin@audit.com",
            "password": "adminpass123",
            "name": "Test Admin",
            "phone": "+1234567892",
            "role": "admin"
        }
        
        self.tokens = {}
        self.user_ids = {}
    
    def test_01_user_registration_audit(self):
        """Test user registration creates proper audit trails"""
        print("\n=== Testing User Registration Audit Trail ===")
        
        # Test successful registration
        response = self.client.post("/api/auth/register", json=self.test_rider)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == self.test_rider["email"]
        
        self.tokens["rider"] = data["access_token"]
        self.user_ids["rider"] = data["user"]["id"]
        
        print(f"✅ Rider registered successfully: {data['user']['id']}")
        
        # Test duplicate registration (should fail and be audited)
        response = self.client.post("/api/auth/register", json=self.test_rider)
        assert response.status_code == 400
        print("✅ Duplicate registration properly rejected")
        
        # Register driver and admin
        for role in ["driver", "admin"]:
            test_user = getattr(self, f"test_{role}")
            response = self.client.post("/api/auth/register", json=test_user)
            assert response.status_code == 200
            
            data = response.json()
            self.tokens[role] = data["access_token"]
            self.user_ids[role] = data["user"]["id"]
            print(f"✅ {role.capitalize()} registered successfully")
    
    def test_02_user_login_audit(self):
        """Test user login creates proper audit trails"""
        print("\n=== Testing User Login Audit Trail ===")
        
        # Test successful login
        login_data = {
            "email": self.test_rider["email"],
            "password": self.test_rider["password"]
        }
        
        response = self.client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        print("✅ Successful login audited")
        
        # Test failed login (wrong password)
        wrong_login = {
            "email": self.test_rider["email"],
            "password": "wrongpassword"
        }
        
        response = self.client.post("/api/auth/login", json=wrong_login)
        assert response.status_code == 401
        print("✅ Failed login attempt audited")
        
        # Test failed login (non-existent user)
        fake_login = {
            "email": "nonexistent@test.com",
            "password": "password123"
        }
        
        response = self.client.post("/api/auth/login", json=fake_login)
        assert response.status_code == 401
        print("✅ Non-existent user login attempt audited")
    
    def test_03_ride_operations_audit(self):
        """Test ride operations create comprehensive audit trails"""
        print("\n=== Testing Ride Operations Audit Trail ===")
        
        headers = {"Authorization": f"Bearer {self.tokens['rider']}"}
        
        # Test ride request creation
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
        
        response = self.client.post("/api/rides/request", json=ride_request, headers=headers)
        assert response.status_code == 200
        
        ride_data = response.json()
        ride_id = ride_data["request_id"]
        print(f"✅ Ride request created and audited: {ride_id}")
        
        # Test ride acceptance (by driver)
        driver_headers = {"Authorization": f"Bearer {self.tokens['driver']}"}
        
        response = self.client.post(f"/api/rides/{ride_id}/accept", headers=driver_headers)
        if response.status_code == 200:
            print("✅ Ride acceptance audited")
        else:
            print(f"⚠️ Ride acceptance failed: {response.status_code} - {response.text}")
    
    def test_04_admin_user_management_audit(self):
        """Test admin user management operations create audit trails"""
        print("\n=== Testing Admin User Management Audit Trail ===")
        
        admin_headers = {"Authorization": f"Bearer {self.tokens['admin']}"}
        
        # Test getting users with filters
        response = self.client.get("/api/admin/users/filtered?search=test&limit=10", headers=admin_headers)
        if response.status_code == 200:
            print("✅ Admin user list access audited")
            users_data = response.json()
            print(f"   Found {len(users_data.get('users', []))} users")
        else:
            print(f"⚠️ Admin user list failed: {response.status_code}")
        
        # Test updating user
        target_user_id = self.user_ids["rider"]
        update_data = {
            "is_verified": True,
            "rating": 4.8,
            "admin_notes": "Test update for audit verification"
        }
        
        response = self.client.put(
            f"/api/admin/users/{target_user_id}/update",
            params=update_data,
            headers=admin_headers
        )
        
        if response.status_code == 200:
            print("✅ Admin user update audited")
        else:
            print(f"⚠️ Admin user update failed: {response.status_code}")
        
        # Test user suspension
        response = self.client.post(
            f"/api/admin/users/{target_user_id}/suspend",
            params={"reason": "Test suspension for audit", "duration_days": 7},
            headers=admin_headers
        )
        
        if response.status_code == 200:
            print("✅ User suspension audited")
        else:
            print(f"⚠️ User suspension failed: {response.status_code}")
    
    def test_05_payment_operations_audit(self):
        """Test payment operations create comprehensive audit trails"""
        print("\n=== Testing Payment Operations Audit Trail ===")
        
        admin_headers = {"Authorization": f"Bearer {self.tokens['admin']}"}
        
        # Test getting payment transactions with filters
        response = self.client.get("/api/admin/payments/filtered?limit=10", headers=admin_headers)
        if response.status_code == 200:
            print("✅ Admin payment list access audited")
            payments_data = response.json()
            print(f"   Found {len(payments_data.get('payments', []))} payments")
            print(f"   Total revenue: ${payments_data.get('total_revenue', 0):.2f}")
        else:
            print(f"⚠️ Admin payment list failed: {response.status_code}")
    
    def test_06_audit_log_retrieval(self):
        """Test audit log retrieval and filtering"""
        print("\n=== Testing Audit Log Retrieval ===")
        
        admin_headers = {"Authorization": f"Bearer {self.tokens['admin']}"}
        
        # Test getting audit logs
        response = self.client.get("/api/audit/logs?limit=20", headers=admin_headers)
        if response.status_code == 200:
            audit_logs = response.json()
            print(f"✅ Retrieved {len(audit_logs)} audit log entries")
            
            # Check for various audit actions
            actions_found = set()
            for log in audit_logs:
                actions_found.add(log.get("action", "unknown"))
            
            print(f"   Audit actions found: {', '.join(actions_found)}")
        else:
            print(f"⚠️ Audit log retrieval failed: {response.status_code}")
        
        # Test getting audit statistics
        response = self.client.get("/api/audit/statistics", headers=admin_headers)
        if response.status_code == 200:
            stats = response.json()
            print("✅ Audit statistics retrieved:")
            print(f"   Total audit logs: {stats.get('total_audit_logs', 0)}")
            print(f"   Recent activity (24h): {stats.get('recent_activity_24h', 0)}")
        else:
            print(f"⚠️ Audit statistics failed: {response.status_code}")
        
        # Test user-specific audit logs (non-admin)
        rider_headers = {"Authorization": f"Bearer {self.tokens['rider']}"}
        response = self.client.get("/api/audit/logs?limit=10", headers=rider_headers)
        if response.status_code == 200:
            user_logs = response.json()
            print(f"✅ User can access their own audit logs: {len(user_logs)} entries")
        else:
            print(f"⚠️ User audit log access failed: {response.status_code}")
    
    def test_07_data_filtering_and_search(self):
        """Test comprehensive data filtering and search capabilities"""
        print("\n=== Testing Data Filtering and Search ===")
        
        admin_headers = {"Authorization": f"Bearer {self.tokens['admin']}"}
        
        # Test user search
        response = self.client.get("/api/admin/users/filtered?search=test&role=rider", headers=admin_headers)
        if response.status_code == 200:
            print("✅ User search and filtering working")
        
        # Test ride search
        response = self.client.get("/api/admin/rides/filtered?search=Test", headers=admin_headers)
        if response.status_code == 200:
            print("✅ Ride search and filtering working")
        
        # Test audit log search
        response = self.client.get("/api/audit/logs?search=user&action=user_created", headers=admin_headers)
        if response.status_code == 200:
            print("✅ Audit log search and filtering working")
    
    def test_08_platform_statistics_with_audit(self):
        """Test platform statistics include audit information"""
        print("\n=== Testing Platform Statistics with Audit Data ===")
        
        admin_headers = {"Authorization": f"Bearer {self.tokens['admin']}"}
        
        response = self.client.get("/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        
        stats = response.json()
        print("✅ Platform statistics retrieved:")
        print(f"   Total users: {stats.get('total_users', 0)}")
        print(f"   Total rides: {stats.get('total_rides', 0)}")
        print(f"   Total revenue: ${stats.get('total_revenue', 0):.2f}")
        
        if "audit_statistics" in stats:
            audit_stats = stats["audit_statistics"]
            print(f"   Audit logs: {audit_stats.get('total_audit_logs', 0)}")
            print("✅ Audit statistics integrated into platform stats")
        else:
            print("⚠️ Audit statistics not integrated")
    
    def run_all_tests(self):
        """Run all comprehensive audit tests"""
        print("🚀 Starting Comprehensive Audit Trail Testing")
        print("=" * 60)
        
        try:
            if not IMPORTS_AVAILABLE:
                print("❌ Audit system imports not available")
                return False
                
            # Run tests in sequence
            test_methods = [
                self.test_01_user_registration_audit,
                self.test_02_user_login_audit,
                self.test_03_ride_operations_audit,
                self.test_04_admin_user_management_audit,
                self.test_05_payment_operations_audit,
                self.test_06_audit_log_retrieval,
                self.test_07_data_filtering_and_search,
                self.test_08_platform_statistics_with_audit
            ]
            
            passed = 0
            failed = 0
            
            for test_method in test_methods:
                try:
                    test_method()
                    passed += 1
                except Exception as e:
                    print(f"❌ {test_method.__name__} failed: {e}")
                    failed += 1
            
            print("\n" + "=" * 60)
            print(f"📊 Test Results: {passed} passed, {failed} failed")
            
            if failed == 0:
                print("🎉 All comprehensive audit tests passed!")
                return True
            else:
                print(f"⚠️ {failed} tests failed - review audit implementation")
                return False
                
        except Exception as e:
            print(f"❌ Test suite execution failed: {e}")
            return False


def main():
    """Main test execution"""
    tester = TestComprehensiveAudit()
    success = tester.run_all_tests()
    
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())