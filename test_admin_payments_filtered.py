#!/usr/bin/env python3
"""
Test script to check what /api/admin/payments/filtered returns
"""

import requests
import json

base_url = "http://localhost:8001"

def test_admin_payments_filtered():
    print("🧪 Testing /api/admin/payments/filtered Endpoint")
    print("=" * 50)
    
    try:
        # 1. Login as admin
        print("1. Logging in as admin...")
        admin_login = {
            "email": "admin@test.com",
            "password": "adminpass123"
        }
        
        response = requests.post(f"{base_url}/api/auth/login", json=admin_login)
        if response.status_code != 200:
            print(f"❌ Admin login failed: {response.status_code}")
            return False
        
        admin_data = response.json()
        admin_token = admin_data['access_token']
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print(f"✅ Admin logged in")
        
        # 2. Test /api/admin/payments/filtered endpoint
        print("\n2. Testing /api/admin/payments/filtered endpoint...")
        response = requests.get(f"{base_url}/api/admin/payments/filtered", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch filtered payments: {response.status_code} - {response.text}")
            return False
        
        filtered_data = response.json()
        print(f"✅ Filtered payments response:")
        print(f"   Type: {type(filtered_data)}")
        print(f"   Keys: {list(filtered_data.keys()) if isinstance(filtered_data, dict) else 'Not a dict'}")
        
        if isinstance(filtered_data, dict):
            for key, value in filtered_data.items():
                if isinstance(value, list):
                    print(f"   {key}: {len(value)} items")
                else:
                    print(f"   {key}: {value}")
        
        # 3. Compare with /api/payments endpoint (admin view)
        print("\n3. Comparing with /api/payments endpoint...")
        response = requests.get(f"{base_url}/api/payments", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch payments: {response.status_code} - {response.text}")
            return False
        
        payments_data = response.json()
        print(f"✅ Direct payments response:")
        print(f"   Type: {type(payments_data)}")
        print(f"   Count: {len(payments_data) if isinstance(payments_data, list) else 'Not a list'}")
        
        if isinstance(payments_data, list) and len(payments_data) > 0:
            print(f"   First payment: {payments_data[0].get('id', 'N/A')[:8]} - {payments_data[0].get('status', 'N/A')} - ${payments_data[0].get('amount', 0)}")
        
        # 4. Test /api/admin/stats endpoint
        print("\n4. Testing /api/admin/stats endpoint...")
        response = requests.get(f"{base_url}/api/admin/stats", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch stats: {response.status_code} - {response.text}")
            return False
        
        stats_data = response.json()
        print(f"✅ Stats response:")
        print(f"   Type: {type(stats_data)}")
        print(f"   Keys: {list(stats_data.keys()) if isinstance(stats_data, dict) else 'Not a dict'}")
        
        if isinstance(stats_data, dict):
            for key, value in stats_data.items():
                print(f"   {key}: {value}")
        
        # 5. Check if the issue is in the admin_crud.py implementation
        print("\n5. Analyzing the discrepancy...")
        
        if isinstance(filtered_data, dict) and 'payments' in filtered_data:
            payments_count = len(filtered_data['payments'])
            print(f"   Filtered payments count: {payments_count}")
        else:
            print(f"   Filtered payments: No 'payments' key found")
        
        if isinstance(payments_data, list):
            direct_payments_count = len(payments_data)
            print(f"   Direct payments count: {direct_payments_count}")
        else:
            print(f"   Direct payments: Not a list")
        
        if isinstance(stats_data, dict) and 'total_revenue' in stats_data:
            print(f"   Stats total revenue: ${stats_data['total_revenue']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    test_admin_payments_filtered()
