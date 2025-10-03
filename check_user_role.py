#!/usr/bin/env python3
"""
Check current user role and available data
"""

import requests
import json

BASE_URL = "http://localhost:8001/api"

def check_user_role(token):
    """Check what role the current user has"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("🔍 Checking current user role...")
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Current user:")
        print(f"   Role: {data.get('role', 'unknown')}")
        print(f"   Email: {data.get('email', 'unknown')}")
        print(f"   Name: {data.get('name', 'unknown')}")
        print(f"   ID: {data.get('id', 'unknown')}")
        return data.get('role')
    else:
        print(f"❌ Failed to get user info: {response.status_code} - {response.text}")
        return None

def show_available_data(role, token):
    """Show what data is available for the current role"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n📊 Available data for {role} role:")
    
    if role == "admin":
        # Admin can see everything
        print("\n🔧 Admin endpoints:")
        
        # Test admin rides
        response = requests.get(f"{BASE_URL}/admin/rides", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Admin rides: {data.get('total_pending', 0)} pending, {data.get('total_completed', 0)} completed")
        
        # Test admin stats
        response = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Platform stats: {data.get('total_users', 0)} users, ${data.get('total_revenue', 0):.2f} revenue")
    
    elif role == "rider":
        # Rider can see their own rides
        print("\n🚗 Rider endpoints:")
        
        # Test rider rides
        response = requests.get(f"{BASE_URL}/rides/my-requests", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ My rides: {data.get('total_pending', 0)} pending, {data.get('total_completed', 0)} completed")
        
        # Test unified endpoint
        response = requests.get(f"{BASE_URL}/rides/unified", headers=headers)
        if response.status_code == 200:
            data = response.json()
            stats = data.get('statistics', {})
            print(f"   ✅ Unified data: {stats}")
    
    elif role == "driver":
        # Driver can see available rides
        print("\n🚕 Driver endpoints:")
        
        # Test available rides
        response = requests.get(f"{BASE_URL}/rides/available", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Available rides: {data.get('total_available', 0)} available, {data.get('total_pending', 0)} total pending")
        else:
            print(f"   ❌ Available rides: {response.status_code} - {response.text}")
        
        # Test unified endpoint
        response = requests.get(f"{BASE_URL}/rides/unified", headers=headers)
        if response.status_code == 200:
            data = response.json()
            stats = data.get('statistics', {})
            print(f"   ✅ Unified data: {stats}")

def create_admin_login():
    """Create admin login credentials"""
    print("\n🔧 To access Real-Time Ride Monitoring:")
    print("   1. Go to frontend registration page")
    print("   2. Register with:")
    print("      Email: admin@test.com")
    print("      Password: adminpass123")
    print("      Role: admin")
    print("   3. Login as admin")
    print("   4. Go to admin dashboard")

if __name__ == "__main__":
    # Your current token from the curl command
    current_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OGYxMjI2MC0xNDg2LTQ0NjMtOTVmYy01YmI2ZDI2ZmRiM2EiLCJyb2xlIjoicmlkZXIiLCJleHAiOjE3NTk0OTE3MDF9.jWhlxekGqBGVikompkQ6QmlkJyxG6QqLHh9hxTNQ34U"
    
    print("🔍 CHECKING CURRENT USER ROLE")
    print("=" * 50)
    
    role = check_user_role(current_token)
    if role:
        show_available_data(role, current_token)
        
        if role != "admin":
            create_admin_login()
        else:
            print("\n✅ You're already logged in as admin!")
            print("   Real-Time Ride Monitoring should be visible in admin dashboard")
    else:
        print("❌ Could not determine user role")
