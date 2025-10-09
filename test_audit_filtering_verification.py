#!/usr/bin/env python3
"""
Test script to verify the updated audit trail filtering functionality
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

def test_updated_filtering():
    """Test the updated audit trail filtering functionality"""
    print("🧪 TESTING UPDATED AUDIT TRAIL FILTERING")
    print("=" * 60)
    
    # Login
    token = login_admin()
    if not token:
        return False
    
    # Get all audit logs first
    print("\n📊 Getting all audit logs...")
    all_logs = get_audit_logs(token, {"limit": 100})
    if not all_logs:
        return False
    
    print(f"✅ Found {len(all_logs)} total audit logs")
    
    # Analyze the actual data structure
    print("\n🔍 Analyzing actual audit log data...")
    actions = set(log.get("action", "unknown") for log in all_logs)
    entities = set(log.get("entity_type", "unknown") for log in all_logs)
    severities = set(log.get("severity", "unknown") for log in all_logs)
    
    print(f"\n📋 ACTUAL Actions found: {len(actions)}")
    for action in sorted(actions):
        count = sum(1 for log in all_logs if log.get("action") == action)
        print(f"   - {action}: {count} logs")
    
    print(f"\n📋 ACTUAL Entities found: {len(entities)}")
    for entity in sorted(entities):
        count = sum(1 for log in all_logs if log.get("entity_type") == entity)
        print(f"   - {entity}: {count} logs")
    
    print(f"\n📋 ACTUAL Severities found: {len(severities)}")
    for severity in sorted(severities):
        count = sum(1 for log in all_logs if log.get("severity") == severity)
        print(f"   - {severity}: {count} logs")
    
    # Test filtering with actual values
    print(f"\n🔍 Testing filtering with actual values...")
    
    # Test most common action
    most_common_action = max(actions, key=lambda a: sum(1 for log in all_logs if log.get("action") == a))
    print(f"\n   Testing filter by most common action: {most_common_action}")
    filtered_logs = get_audit_logs(token, {"action": most_common_action, "limit": 10})
    if filtered_logs:
        print(f"   ✅ Found {len(filtered_logs)} logs for action '{most_common_action}'")
        for log in filtered_logs[:3]:
            print(f"      - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
    else:
        print(f"   ❌ No logs found for action '{most_common_action}'")
    
    # Test most common entity
    most_common_entity = max(entities, key=lambda e: sum(1 for log in all_logs if log.get("entity_type") == e))
    print(f"\n   Testing filter by most common entity: {most_common_entity}")
    filtered_logs = get_audit_logs(token, {"entity_type": most_common_entity, "limit": 10})
    if filtered_logs:
        print(f"   ✅ Found {len(filtered_logs)} logs for entity '{most_common_entity}'")
        for log in filtered_logs[:3]:
            print(f"      - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
    else:
        print(f"   ❌ No logs found for entity '{most_common_entity}'")
    
    # Test most common severity
    most_common_severity = max(severities, key=lambda s: sum(1 for log in all_logs if log.get("severity") == s))
    print(f"\n   Testing filter by most common severity: {most_common_severity}")
    filtered_logs = get_audit_logs(token, {"severity": most_common_severity, "limit": 10})
    if filtered_logs:
        print(f"   ✅ Found {len(filtered_logs)} logs for severity '{most_common_severity}'")
        for log in filtered_logs[:3]:
            print(f"      - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
    else:
        print(f"   ❌ No logs found for severity '{most_common_severity}'")
    
    # Test combined filtering
    print(f"\n   Testing combined filters...")
    combined_logs = get_audit_logs(token, {
        "action": most_common_action,
        "severity": most_common_severity,
        "limit": 5
    })
    if combined_logs:
        print(f"   ✅ Found {len(combined_logs)} logs for combined filters")
        for log in combined_logs[:3]:
            print(f"      - {log.get('action')} ({log.get('severity')}) - {log.get('entity_type')}")
    else:
        print(f"   ❌ No logs found for combined filters")
    
    # Test specific actions that should exist
    expected_actions = [
        "user_login",
        "admin_system_config_changed", 
        "admin_ride_modified",
        "ride_query",
        "payment_query"
    ]
    
    print(f"\n🔍 Testing expected actions...")
    for action in expected_actions:
        if action in actions:
            count = sum(1 for log in all_logs if log.get("action") == action)
            print(f"   ✅ {action}: {count} logs found")
        else:
            print(f"   ❌ {action}: NOT FOUND in audit logs")
    
    # Test specific entities that should exist
    expected_entities = [
        "user",
        "balance_transaction",
        "admin_ride_query",
        "ride_requests",
        "payment_query"
    ]
    
    print(f"\n🔍 Testing expected entities...")
    for entity in expected_entities:
        if entity in entities:
            count = sum(1 for log in all_logs if log.get("entity_type") == entity)
            print(f"   ✅ {entity}: {count} logs found")
        else:
            print(f"   ❌ {entity}: NOT FOUND in audit logs")
    
    print(f"\n🎉 AUDIT TRAIL FILTERING VERIFICATION COMPLETED!")
    return True

if __name__ == "__main__":
    success = test_updated_filtering()
    sys.exit(0 if success else 1)
