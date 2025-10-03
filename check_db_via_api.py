#!/usr/bin/env python3
"""
Check database state via API endpoints
This works even if MongoDB is not directly accessible
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

def get_admin_token():
    """Get admin token for database inspection"""
    # Try to login with existing admin
    login_data = {
        "email": "admin@test.com",
        "password": "adminpass123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data["access_token"]
    else:
        print(f"❌ Failed to get admin token: {response.status_code}")
        return None

def check_database_via_api():
    """Check database state using API endpoints"""
    print("🔍 CHECKING DATABASE STATE VIA API")
    print("="*60)
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Cannot proceed without admin access")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    print("\n📊 PLATFORM STATISTICS")
    print("-" * 40)
    
    # Get platform stats
    response = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Total Users: {stats.get('total_users', 0)}")
        print(f"✅ Total Drivers: {stats.get('total_drivers', 0)}")
        print(f"✅ Total Riders: {stats.get('total_riders', 0)}")
        print(f"✅ Total Rides: {stats.get('total_rides', 0)}")
        print(f"✅ Completed Rides: {stats.get('completed_rides', 0)}")
        print(f"✅ Online Drivers: {stats.get('online_drivers', 0)}")
        print(f"✅ Total Revenue: ${stats.get('total_revenue', 0):.2f}")
        print(f"✅ Completion Rate: {stats.get('completion_rate', 0)}%")
    else:
        print(f"❌ Failed to get platform stats: {response.status_code}")
    
    print("\n🚗 RIDE DATA")
    print("-" * 40)
    
    # Get all rides
    response = requests.get(f"{BASE_URL}/admin/rides", headers=headers)
    if response.status_code == 200:
        rides_data = response.json()
        print(f"✅ Pending Requests: {rides_data.get('total_pending', 0)}")
        print(f"✅ Completed Matches: {rides_data.get('total_completed', 0)}")
        print(f"✅ Total Rides: {rides_data.get('total_rides', 0)}")
        
        # Show recent pending requests
        pending_requests = rides_data.get('pending_requests', [])
        if pending_requests:
            print(f"\n📋 Recent Pending Requests ({len(pending_requests)}):")
            for i, req in enumerate(pending_requests[:5], 1):
                pickup = req.get('pickup_location', {}).get('address', 'Unknown')
                dropoff = req.get('dropoff_location', {}).get('address', 'Unknown')
                created = req.get('created_at', 'Unknown')
                rider_id = req.get('rider_id', 'Unknown')[:8] if req.get('rider_id') else 'Unknown'
                print(f"   {i}. {rider_id}... | {pickup} → {dropoff} | {created}")
        
        # Show completed matches
        completed_matches = rides_data.get('completed_matches', [])
        if completed_matches:
            print(f"\n✅ Completed Matches ({len(completed_matches)}):")
            for i, match in enumerate(completed_matches[:3], 1):
                rider_id = match.get('rider_id', 'Unknown')[:8] if match.get('rider_id') else 'Unknown'
                driver_id = match.get('driver_id', 'Unknown')[:8] if match.get('driver_id') else 'Unknown'
                status = match.get('status', 'Unknown')
                print(f"   {i}. Rider: {rider_id}... | Driver: {driver_id}... | Status: {status}")
    else:
        print(f"❌ Failed to get ride data: {response.status_code}")
    
    print("\n👥 USER DATA")
    print("-" * 40)
    
    # Get users with filters
    response = requests.get(f"{BASE_URL}/admin/users/filtered?limit=100", headers=headers)
    if response.status_code == 200:
        users_data = response.json()
        users = users_data.get('users', [])
        print(f"✅ Total Users: {len(users)}")
        
        # Count by role
        role_counts = {}
        online_count = 0
        for user in users:
            role = user.get('role', 'unknown')
            role_counts[role] = role_counts.get(role, 0) + 1
            if user.get('is_online', False):
                online_count += 1
        
        print("   Role breakdown:")
        for role, count in role_counts.items():
            print(f"     - {role}: {count}")
        print(f"   Online users: {online_count}")
        
        # Show recent users
        print(f"\n👤 Recent Users:")
        for i, user in enumerate(users[:5], 1):
            email = user.get('email', 'Unknown')
            role = user.get('role', 'Unknown')
            online = "🟢" if user.get('is_online', False) else "🔴"
            created = user.get('created_at', 'Unknown')
            print(f"   {i}. {email} | {role} | {online} | {created}")
    else:
        print(f"❌ Failed to get user data: {response.status_code}")
    
    print("\n💰 PAYMENT DATA")
    print("-" * 40)
    
    # Get payments
    response = requests.get(f"{BASE_URL}/admin/payments/filtered?limit=100", headers=headers)
    if response.status_code == 200:
        payments_data = response.json()
        payments = payments_data.get('payments', [])
        total_revenue = payments_data.get('total_revenue', 0)
        
        print(f"✅ Total Payments: {len(payments)}")
        print(f"✅ Total Revenue: ${total_revenue:.2f}")
        
        if payments:
            # Count by status
            status_counts = {}
            for payment in payments:
                status = payment.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            print("   Status breakdown:")
            for status, count in status_counts.items():
                print(f"     - {status}: {count}")
    else:
        print(f"❌ Failed to get payment data: {response.status_code}")
    
    print("\n📝 AUDIT LOGS")
    print("-" * 40)
    
    # Get audit logs
    response = requests.get(f"{BASE_URL}/audit/logs?limit=20", headers=headers)
    if response.status_code == 200:
        audit_logs = response.json()
        print(f"✅ Recent Audit Logs: {len(audit_logs)}")
        
        if audit_logs:
            print("   Recent activities:")
            for i, log in enumerate(audit_logs[:5], 1):
                action = log.get('action', 'unknown')
                user_id = log.get('user_id', 'system')[:8] if log.get('user_id') else 'system'
                timestamp = log.get('timestamp', 'unknown')
                entity_type = log.get('entity_type', 'unknown')
                print(f"   {i}. {action} | {entity_type} | {user_id}... | {timestamp}")
    else:
        print(f"❌ Failed to get audit logs: {response.status_code}")
    
    print("\n" + "="*60)
    print("✅ DATABASE STATE CHECK COMPLETE")
    print("="*60)

def check_specific_user_data():
    """Check data for a specific user"""
    print("\n🔍 CHECKING SPECIFIC USER DATA")
    print("="*60)
    
    # Get rider token
    login_data = {
        "email": "debug_rider@test.com",
        "password": "testpass123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        rider_token = data["access_token"]
        rider_id = data["user"]["id"]
        
        headers = {"Authorization": f"Bearer {rider_token}"}
        
        print(f"👤 Checking data for rider: {data['user']['email']}")
        print(f"   User ID: {rider_id}")
        
        # Get rider's rides
        response = requests.get(f"{BASE_URL}/rides/my-requests", headers=headers)
        if response.status_code == 200:
            rides_data = response.json()
            print(f"   Pending requests: {rides_data.get('total_pending', 0)}")
            print(f"   Completed rides: {rides_data.get('total_completed', 0)}")
            
            # Show pending requests
            pending = rides_data.get('pending_requests', [])
            if pending:
                print("   Recent pending requests:")
                for req in pending[:3]:
                    pickup = req.get('pickup_location', {}).get('address', 'Unknown')
                    dropoff = req.get('dropoff_location', {}).get('address', 'Unknown')
                    status = req.get('status', 'Unknown')
                    print(f"     - {pickup} → {dropoff} | {status}")
        
        # Get unified data
        response = requests.get(f"{BASE_URL}/rides/unified", headers=headers)
        if response.status_code == 200:
            unified_data = response.json()
            stats = unified_data.get('statistics', {})
            print(f"   Unified stats: {stats}")

if __name__ == "__main__":
    check_database_via_api()
    check_specific_user_data()
