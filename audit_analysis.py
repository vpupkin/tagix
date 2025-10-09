#!/usr/bin/env python3
"""
Audit Analysis Script
Detailed analysis of audit logs to verify system integrity
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

BASE_URL = "http://localhost:8001"

async def analyze_audit_logs():
    """Analyze audit logs in detail"""
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
        
        # Get all audit logs
        async with session.get(
            f"{BASE_URL}/api/audit/logs?limit=1000",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status != 200:
                print("❌ Failed to get audit logs")
                return
            audit_logs = await response.json()
        
        print(f"📊 Total audit logs: {len(audit_logs)}")
        
        # Analyze by action type
        action_counts = {}
        for log in audit_logs:
            action = log.get("action", "unknown")
            action_counts[action] = action_counts.get(action, 0) + 1
        
        print("\n📋 Audit Actions Summary:")
        for action, count in sorted(action_counts.items()):
            print(f"  {action}: {count}")
        
        # Get recent logs (last 2 hours)
        recent_logs = []
        cutoff_time = datetime.now() - timedelta(hours=2)
        
        for log in audit_logs:
            try:
                timestamp_str = log.get("timestamp", "")
                if timestamp_str.endswith("Z"):
                    timestamp_str = timestamp_str[:-1] + "+00:00"
                log_time = datetime.fromisoformat(timestamp_str)
                if log_time.replace(tzinfo=None) > cutoff_time:
                    recent_logs.append(log)
            except Exception as e:
                print(f"⚠️  Error parsing timestamp {log.get('timestamp', 'unknown')}: {e}")
        
        print(f"\n🕐 Recent logs (last 2 hours): {len(recent_logs)}")
        
        if recent_logs:
            print("\n📝 Recent Audit Actions:")
            recent_actions = {}
            for log in recent_logs:
                action = log.get("action", "unknown")
                recent_actions[action] = recent_actions.get(action, 0) + 1
            
            for action, count in sorted(recent_actions.items()):
                print(f"  {action}: {count}")
            
            # Show sample recent logs
            print("\n🔍 Sample Recent Logs:")
            for i, log in enumerate(recent_logs[-5:]):  # Last 5 logs
                print(f"  {i+1}. {log.get('action', 'unknown')} - {log.get('timestamp', 'no timestamp')}")
                if log.get('metadata'):
                    print(f"     Metadata: {log['metadata']}")
        
        # Check for specific test actions
        test_related_logs = []
        for log in audit_logs:
            description = log.get("description", "").lower()
            if any(keyword in description for keyword in ["test", "system", "comprehensive"]):
                test_related_logs.append(log)
        
        print(f"\n🧪 Test-related logs: {len(test_related_logs)}")
        for log in test_related_logs:
            print(f"  - {log.get('action', 'unknown')}: {log.get('description', 'no description')}")
        
        # Check for ride-related actions
        ride_actions = ["ride_request", "ride_accept", "ride_start", "ride_complete"]
        ride_logs = []
        for log in audit_logs:
            if any(action in log.get("action", "") for action in ride_actions):
                ride_logs.append(log)
        
        print(f"\n🚗 Ride-related logs: {len(ride_logs)}")
        for log in ride_logs:
            print(f"  - {log.get('action', 'unknown')}: {log.get('entity_id', 'no id')} at {log.get('timestamp', 'no timestamp')}")
        
        # Check for balance-related actions
        balance_logs = []
        for log in audit_logs:
            action = log.get("action", "").lower()
            entity_type = log.get("entity_type", "").lower()
            description = log.get("description", "").lower()
            if ("balance" in action or "transaction" in action or 
                "balance" in entity_type or "transaction" in entity_type or
                "balance" in description or "transaction" in description):
                balance_logs.append(log)
        
        print(f"\n💰 Balance-related logs: {len(balance_logs)}")
        for log in balance_logs:
            print(f"  - {log.get('action', 'unknown')}: {log.get('description', 'no description')}")

if __name__ == "__main__":
    asyncio.run(analyze_audit_logs())
