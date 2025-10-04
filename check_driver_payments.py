#!/usr/bin/env python3
"""
Script to check driver payments and understand the data discrepancy
"""

import requests
import json

base_url = "http://localhost:8001"

def check_driver_payments():
    print("🔍 Checking Driver Payments")
    print("=" * 50)
    
    try:
        # 1. Login as driver
        print("1. Logging in as driver...")
        driver_login = {
            "email": "driver@test.com", 
            "password": "testpass123"
        }
        
        response = requests.post(f"{base_url}/api/auth/login", json=driver_login)
        if response.status_code != 200:
            print(f"❌ Driver login failed: {response.status_code} - {response.text}")
            return False
        
        driver_data = response.json()
        driver_token = driver_data['access_token']
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        print(f"✅ Driver logged in: {driver_data['user']['name']}")
        
        # 2. Get driver's payments
        print("\n2. Fetching driver payments...")
        response = requests.get(f"{base_url}/api/payments", headers=driver_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch payments: {response.status_code} - {response.text}")
            return False
        
        payments = response.json()
        print(f"✅ Found {len(payments)} payments for driver")
        
        if payments:
            print("\n3. Payment details:")
            for i, payment in enumerate(payments, 1):
                print(f"   Payment {i}:")
                print(f"     ID: {payment.get('id', 'N/A')}")
                print(f"     Status: {payment.get('status', 'N/A')}")
                print(f"     Amount: ${payment.get('amount', 0)}")
                print(f"     Driver Earnings: ${payment.get('driver_earnings', 0)}")
                print(f"     Created: {payment.get('created_at', 'N/A')}")
                print(f"     Ride ID: {payment.get('ride_id', 'N/A')}")
                print()
        
        # 3. Get driver's earnings summary
        print("4. Fetching earnings summary...")
        response = requests.get(f"{base_url}/api/payments/summary", headers=driver_headers)
        if response.status_code == 200:
            summary = response.json()
            print(f"✅ Earnings summary:")
            print(f"   Total Earnings: ${summary.get('total_earnings', 0)}")
            print(f"   Total Rides: {summary.get('total_rides', 0)}")
            print(f"   Total Revenue: ${summary.get('total_revenue', 0)}")
        else:
            print(f"❌ Failed to fetch earnings summary: {response.status_code}")
        
        # 4. Check if we can process the pending payments
        pending_payments = [p for p in payments if p.get('status') == 'pending']
        if pending_payments:
            print(f"\n5. Found {len(pending_payments)} pending payments to process...")
            
            for payment in pending_payments:
                payment_id = payment['id']
                print(f"   Processing payment {payment_id[:8]}...")
                
                try:
                    response = requests.post(f"{base_url}/api/payments/{payment_id}/process", headers=driver_headers)
                    if response.status_code == 200:
                        print(f"   ✅ Payment processed successfully")
                    else:
                        print(f"   ❌ Failed to process payment: {response.status_code} - {response.text}")
                except Exception as e:
                    print(f"   ❌ Error processing payment: {e}")
            
            # Check earnings again after processing
            print("\n6. Checking earnings after processing...")
            response = requests.get(f"{base_url}/api/payments/summary", headers=driver_headers)
            if response.status_code == 200:
                summary = response.json()
                print(f"✅ Updated earnings summary:")
                print(f"   Total Earnings: ${summary.get('total_earnings', 0)}")
                print(f"   Total Rides: {summary.get('total_rides', 0)}")
                print(f"   Total Revenue: ${summary.get('total_revenue', 0)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Script failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = check_driver_payments()
    if success:
        print("\n🎉 Payment check completed!")
    else:
        print("\n💥 Payment check failed")
