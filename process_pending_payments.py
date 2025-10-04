#!/usr/bin/env python3
"""
Script to process pending payments for drivers
This will complete the payment processing and update earnings
"""

import requests
import json

base_url = "http://localhost:8001"

def process_pending_payments():
    print("🔄 Processing Pending Payments")
    print("=" * 50)
    
    try:
        # 1. Login as admin to process payments
        print("1. Logging in as admin...")
        admin_login = {
            "email": "admin@test.com",
            "password": "adminpass123"
        }
        
        response = requests.post(f"{base_url}/api/auth/login", json=admin_login)
        if response.status_code != 200:
            print(f"❌ Admin login failed: {response.status_code} - {response.text}")
            return False
        
        admin_data = response.json()
        admin_token = admin_data['access_token']
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print(f"✅ Admin logged in: {admin_data['user']['name']}")
        
        # 2. Get all pending payments
        print("\n2. Fetching pending payments...")
        response = requests.get(f"{base_url}/api/admin/payments/filtered", headers=admin_headers)
        if response.status_code != 200:
            print(f"❌ Failed to fetch payments: {response.status_code} - {response.text}")
            return False
        
        payments_data = response.json()
        print(f"   Response structure: {type(payments_data)}")
        print(f"   Response keys: {list(payments_data.keys()) if isinstance(payments_data, dict) else 'Not a dict'}")
        
        # The filtered endpoint might return a different structure
        if isinstance(payments_data, dict):
            payments = payments_data.get('payments', [])
        else:
            payments = payments_data
        
        pending_payments = [p for p in payments if p.get('status') == 'pending']
        print(f"✅ Found {len(pending_payments)} pending payments")
        
        if not pending_payments:
            print("ℹ️ No pending payments to process")
            return True
        
        # 3. Process each pending payment
        print(f"\n3. Processing {len(pending_payments)} pending payments...")
        processed_count = 0
        
        for payment in pending_payments:
            payment_id = payment['id']
            driver_id = payment.get('driver_id', 'Unknown')
            amount = payment.get('amount', 0)
            driver_earnings = payment.get('driver_earnings', 0)
            
            print(f"   Processing payment {payment_id[:8]}... (Driver: {driver_id[:8]}, Amount: ${amount}, Driver Earnings: ${driver_earnings})")
            
            try:
                response = requests.post(f"{base_url}/api/payments/{payment_id}/process", headers=admin_headers)
                if response.status_code == 200:
                    print(f"   ✅ Payment processed successfully")
                    processed_count += 1
                else:
                    print(f"   ❌ Failed to process payment: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"   ❌ Error processing payment: {e}")
        
        print(f"\n✅ Successfully processed {processed_count}/{len(pending_payments)} payments")
        
        # 4. Verify earnings update
        print("\n4. Verifying earnings update...")
        if processed_count > 0:
            # Login as a driver to check earnings
            driver_login = {
                "email": "driver@test.com", 
                "password": "testpass123"
            }
            
            response = requests.post(f"{base_url}/api/auth/login", json=driver_login)
            if response.status_code == 200:
                driver_data = response.json()
                driver_token = driver_data['access_token']
                driver_headers = {"Authorization": f"Bearer {driver_token}"}
                
                # Check earnings summary
                response = requests.get(f"{base_url}/api/payments/summary", headers=driver_headers)
                if response.status_code == 200:
                    summary = response.json()
                    print(f"✅ Driver earnings summary:")
                    print(f"   Total Earnings: ${summary.get('total_earnings', 0)}")
                    print(f"   Total Rides: {summary.get('total_rides', 0)}")
                    print(f"   Total Revenue: ${summary.get('total_revenue', 0)}")
                else:
                    print(f"❌ Failed to fetch earnings summary: {response.status_code}")
            else:
                print("⚠️ Could not verify earnings (driver login failed)")
        
        return True
        
    except Exception as e:
        print(f"❌ Script failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = process_pending_payments()
    if success:
        print("\n🎉 Payment processing completed!")
    else:
        print("\n💥 Payment processing failed")
