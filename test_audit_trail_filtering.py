#!/usr/bin/env python3
"""
Test script to verify audit trail filtering functionality
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8001"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "adminpass123"

def login_admin():
    """Login as admin and return token"""
    print("🔐 Logging in as admin...")
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Admin login successful")
        return data["access_token"]
    else:
        print(f"❌ Admin login failed: {response.status_code}")
        print(response.text)
        return None

def get_audit_logs(token, params=None):
    """Get audit logs with optional parameters"""
    headers = {"Authorization": f"Bearer {token}"}
    
    if params:
        response = requests.get(f"{BASE_URL}/api/audit/logs", headers=headers, params=params)
    else:
        response = requests.get(f"{BASE_URL}/api/audit/logs", headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get audit logs: {response.status_code}")
        print(response.text)
        return None

def test_audit_filtering():
    """Test audit trail filtering functionality"""
    print("🧪 TESTING AUDIT TRAIL FILTERING")
    print("=" * 50)
    
    # Login
    token = login_admin()
    if not token:
        return False
    
    # Get all audit logs first
    print("\n📊 Getting all audit logs...")
    all_logs = get_audit_logs(token, {"limit": 50})
    if not all_logs:
        return False
    
    print(f"✅ Found {len(all_logs)} total audit logs")
    
    # Show sample of available actions and entities
    actions = set(log.get("action", "unknown") for log in all_logs)
    entities = set(log.get("entity_type", "unknown") for log in all_logs)
    severities = set(log.get("severity", "unknown") for log in all_logs)
    
    print(f"\n📋 Available Actions: {', '.join(sorted(actions))}")
    print(f"📋 Available Entities: {', '.join(sorted(entities))}")
    print(f"📋 Available Severities: {', '.join(sorted(severities))}")
    
    # Test filtering by action
    if "BALANCE_TRANSACTION" in actions:
        print(f"\n🔍 Testing filter by action: BALANCE_TRANSACTION")
        balance_logs = get_audit_logs(token, {"action": "BALANCE_TRANSACTION", "limit": 10})
        if balance_logs:
            print(f"✅ Found {len(balance_logs)} balance transaction logs")
            for log in balance_logs[:3]:
                print(f"   - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
        else:
            print("❌ No balance transaction logs found")
    
    # Test filtering by entity type
    if "user" in entities:
        print(f"\n🔍 Testing filter by entity: user")
        user_logs = get_audit_logs(token, {"entity_type": "user", "limit": 10})
        if user_logs:
            print(f"✅ Found {len(user_logs)} user-related logs")
            for log in user_logs[:3]:
                print(f"   - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
        else:
            print("❌ No user-related logs found")
    
    # Test filtering by severity
    if "low" in severities:
        print(f"\n🔍 Testing filter by severity: low")
        low_logs = get_audit_logs(token, {"severity": "low", "limit": 10})
        if low_logs:
            print(f"✅ Found {len(low_logs)} low severity logs")
            for log in low_logs[:3]:
                print(f"   - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
        else:
            print("❌ No low severity logs found")
    
    # Test combined filtering
    print(f"\n🔍 Testing combined filters: action=BALANCE_TRANSACTION, severity=info")
    combined_logs = get_audit_logs(token, {
        "action": "BALANCE_TRANSACTION",
        "severity": "info",
        "limit": 10
    })
    if combined_logs:
        print(f"✅ Found {len(combined_logs)} logs matching combined filters")
        for log in combined_logs[:3]:
            print(f"   - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
    else:
        print("❌ No logs found matching combined filters")
    
    # Test limit parameter
    print(f"\n🔍 Testing limit parameter: limit=3")
    limited_logs = get_audit_logs(token, {"limit": 3})
    if limited_logs:
        print(f"✅ Found {len(limited_logs)} logs (should be max 3)")
        for log in limited_logs:
            print(f"   - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
    else:
        print("❌ No logs found with limit")
    
    print(f"\n🎉 AUDIT TRAIL FILTERING TEST COMPLETED!")
    return True

if __name__ == "__main__":
    success = test_audit_filtering()
    sys.exit(0 if success else 1)
