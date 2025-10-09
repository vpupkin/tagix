#!/usr/bin/env python3
"""
Test Balance Transactions
Test all transaction types (credit, debit, refund) to verify they work correctly
"""

import asyncio
import aiohttp
import json

BASE_URL = "http://localhost:8001"

async def test_balance_transactions():
    """Test all balance transaction types"""
    async with aiohttp.ClientSession() as session:
        # Login as admin
        async with session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "testadmin@test.com", "password": "testpass123"}
        ) as response:
            if response.status != 200:
                print("❌ Failed to login as admin")
                return
            data = await response.json()
            token = data["access_token"]
            print("✅ Admin login successful")
        
        # Get driver user ID
        driver_id = "911b2bd4-60b5-43e2-a77e-ea1f8cb68219"
        
        # Test 1: Credit Transaction
        print("\n💰 Testing Credit Transaction...")
        credit_data = {
            "user_id": driver_id,
            "amount": 15.00,
            "transaction_type": "credit",
            "description": "Test credit transaction"
        }
        
        async with session.post(
            f"{BASE_URL}/api/admin/users/{driver_id}/balance/transaction",
            json=credit_data,
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Credit: ${data['amount']} -> Balance: ${data['new_balance']}")
            else:
                error = await response.text()
                print(f"❌ Credit failed: {response.status} - {error}")
        
        # Test 2: Debit Transaction
        print("\n💸 Testing Debit Transaction...")
        debit_data = {
            "user_id": driver_id,
            "amount": 5.00,
            "transaction_type": "debit",
            "description": "Test debit transaction"
        }
        
        async with session.post(
            f"{BASE_URL}/api/admin/users/{driver_id}/balance/transaction",
            json=debit_data,
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Debit: ${data['amount']} -> Balance: ${data['new_balance']}")
            else:
                error = await response.text()
                print(f"❌ Debit failed: {response.status} - {error}")
        
        # Test 3: Refund Transaction
        print("\n🔄 Testing Refund Transaction...")
        refund_data = {
            "user_id": driver_id,
            "amount": 3.00,
            "transaction_type": "refund",
            "description": "Test refund transaction"
        }
        
        async with session.post(
            f"{BASE_URL}/api/admin/users/{driver_id}/balance/transaction",
            json=refund_data,
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Refund: ${data['amount']} -> Balance: ${data['new_balance']}")
            else:
                error = await response.text()
                print(f"❌ Refund failed: {response.status} - {error}")
        
        # Test 4: Get user balance to verify
        print("\n📊 Getting final balance...")
        async with session.get(
            f"{BASE_URL}/api/admin/users/{driver_id}/balance",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Final balance: ${data['current_balance']}")
                print(f"✅ Recent transactions: {len(data['recent_transactions'])}")
                
                # Show recent transactions
                print("\n📋 Recent Transactions:")
                for i, tx in enumerate(data['recent_transactions'][:5]):
                    change = "+" if tx['amount_change'] > 0 else ""
                    print(f"  {i+1}. {tx['transaction_type'].upper()}: {change}${tx['amount_change']} - {tx['description']}")
            else:
                error = await response.text()
                print(f"❌ Failed to get balance: {response.status} - {error}")

if __name__ == "__main__":
    asyncio.run(test_balance_transactions())
