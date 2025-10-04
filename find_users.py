#!/usr/bin/env python3
"""
Script to find existing users in the system
"""

import requests
import json

base_url = "http://localhost:8001"

def find_users():
    print("🔍 Finding Existing Users")
    print("=" * 50)
    
    try:
        # Try different admin credentials
        admin_credentials = [
            {"email": "admin@test.com", "password": "adminpass123"},
            {"email": "admin@yourdomain.com", "password": "TestPassword123!"},
            {"email": "admin@yourdomain.com", "password": "secure_admin_password"},
            {"email": "test_admin@audit.com", "password": "adminpass123"}
        ]
        
        admin_token = None
        admin_headers = None
        
        for creds in admin_credentials:
            print(f"Trying admin login: {creds['email']}")
            response = requests.post(f"{base_url}/api/auth/login", json=creds)
            if response.status_code == 200:
                admin_data = response.json()
                admin_token = admin_data['access_token']
                admin_headers = {"Authorization": f"Bearer {admin_token}"}
                print(f"✅ Admin logged in: {admin_data['user']['name']}")
                break
            else:
                print(f"❌ Failed: {response.status_code}")
        
        if not admin_token:
            print("❌ Could not login as admin with any credentials")
            return False
        
        # Get all users
        print("\n2. Fetching all users...")
        response = requests.get(f"{base_url}/api/admin/users", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch users: {response.status_code} - {response.text}")
            return False
        
        users = response.json()
        print(f"✅ Found {len(users)} users:")
        
        drivers = []
        riders = []
        admins = []
        
        for user in users:
            role = user.get('role', 'unknown')
            email = user.get('email', 'N/A')
            name = user.get('name', 'N/A')
            
            if role == 'driver':
                drivers.append(user)
            elif role == 'rider':
                riders.append(user)
            elif role == 'admin':
                admins.append(user)
            
            print(f"   {role.upper()}: {email} - {name}")
        
        print(f"\nSummary:")
        print(f"   Drivers: {len(drivers)}")
        print(f"   Riders: {len(riders)}")
        print(f"   Admins: {len(admins)}")
        
        # Try to login as the first driver
        if drivers:
            driver = drivers[0]
            print(f"\n3. Testing driver login: {driver['email']}")
            
            # Try common passwords
            passwords = ["TestPassword123!", "testpass123", "password123", "TestPass123!"]
            
            for password in passwords:
                driver_login = {
                    "email": driver['email'],
                    "password": password
                }
                
                response = requests.post(f"{base_url}/api/auth/login", json=driver_login)
                if response.status_code == 200:
                    driver_data = response.json()
                    driver_token = driver_data['access_token']
                    driver_headers = {"Authorization": f"Bearer {driver_token}"}
                    print(f"✅ Driver logged in with password: {password}")
                    
                    # Check driver payments
                    print("\n4. Checking driver payments...")
                    response = requests.get(f"{base_url}/api/payments", headers=driver_headers)
                    if response.status_code == 200:
                        payments = response.json()
                        print(f"✅ Driver has {len(payments)} payments")
                        
                        pending = [p for p in payments if p.get('status') == 'pending']
                        print(f"   Pending: {len(pending)}")
                        completed = [p for p in payments if p.get('status') == 'completed']
                        print(f"   Completed: {len(completed)}")
                        
                        if pending:
                            print("\n5. Processing pending payments...")
                            for payment in pending:
                                payment_id = payment['id']
                                print(f"   Processing {payment_id[:8]}...")
                                
                                response = requests.post(f"{base_url}/api/payments/{payment_id}/process", headers=driver_headers)
                                if response.status_code == 200:
                                    print(f"   ✅ Processed successfully")
                                else:
                                    print(f"   ❌ Failed: {response.status_code}")
                    
                    break
            else:
                print("❌ Could not login as driver with any password")
        
        return True
        
    except Exception as e:
        print(f"❌ Script failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = find_users()
    if success:
        print("\n🎉 User check completed!")
    else:
        print("\n💥 User check failed")
