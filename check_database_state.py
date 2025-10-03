#!/usr/bin/env python3
"""
Comprehensive database state checker for MobilityHub
Shows all collections, documents, and key statistics
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import json

# Try to load environment variables
try:
    # Try different possible locations for .env file
    env_paths = [
        'backend/.env',
        '.env',
        '../backend/.env'
    ]
    
    env_loaded = False
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            env_loaded = True
            print(f"✅ Loaded environment from: {env_path}")
            break
    
    if not env_loaded:
        print("⚠️ No .env file found, using default MongoDB connection")
        # Use default MongoDB connection
        MONGO_URL = "mongodb://localhost:27017"
        DB_NAME = "mobilityhub"
except Exception as e:
    print(f"⚠️ Could not load .env: {e}")
    MONGO_URL = "mongodb://localhost:27017"
    DB_NAME = "mobilityhub"

# Get connection details
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'mobilityhub')

print(f"🔗 Connecting to: {MONGO_URL}")
print(f"📊 Database: {DB_NAME}")

async def check_database_state():
    """Check the complete state of the database"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        print("\n" + "="*60)
        print("🗄️  DATABASE STATE OVERVIEW")
        print("="*60)
        
        # List all collections
        collections = await db.list_collection_names()
        print(f"\n📁 Collections found: {len(collections)}")
        for collection_name in sorted(collections):
            print(f"   - {collection_name}")
        
        print("\n" + "="*60)
        print("📊 COLLECTION DETAILS")
        print("="*60)
        
        # Check each collection
        for collection_name in sorted(collections):
            collection = db[collection_name]
            count = await collection.count_documents({})
            
            print(f"\n📋 {collection_name.upper()}")
            print(f"   Total documents: {count}")
            
            if count > 0:
                # Get sample documents
                sample_docs = await collection.find({}).limit(3).to_list(None)
                
                print(f"   Sample documents:")
                for i, doc in enumerate(sample_docs, 1):
                    # Clean up the document for display
                    clean_doc = {}
                    for key, value in doc.items():
                        if key == '_id':
                            clean_doc[key] = str(value)
                        elif isinstance(value, datetime):
                            clean_doc[key] = value.isoformat()
                        elif hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
                            clean_doc[key] = str(value)
                        else:
                            clean_doc[key] = value
                    
                    print(f"     {i}. {json.dumps(clean_doc, indent=6, default=str)}")
                
                if count > 3:
                    print(f"     ... and {count - 3} more documents")
        
        print("\n" + "="*60)
        print("🎯 RIDE SYSTEM ANALYSIS")
        print("="*60)
        
        # Analyze ride system
        ride_requests = await db.ride_requests.find({}).to_list(None)
        ride_matches = await db.ride_matches.find({}).to_list(None)
        users = await db.users.find({}).to_list(None)
        
        print(f"\n🚗 RIDE REQUESTS: {len(ride_requests)}")
        if ride_requests:
            status_counts = {}
            for req in ride_requests:
                status = req.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            print("   Status breakdown:")
            for status, count in status_counts.items():
                print(f"     - {status}: {count}")
            
            # Show recent requests
            recent_requests = sorted(ride_requests, key=lambda x: x.get('created_at', datetime.min), reverse=True)[:3]
            print("   Recent requests:")
            for req in recent_requests:
                created = req.get('created_at', 'unknown')
                pickup = req.get('pickup_location', {}).get('address', 'unknown')
                dropoff = req.get('dropoff_location', {}).get('address', 'unknown')
                print(f"     - {req.get('id', 'N/A')[:8]}... | {pickup} → {dropoff} | {created}")
        
        print(f"\n🤝 RIDE MATCHES: {len(ride_matches)}")
        if ride_matches:
            status_counts = {}
            for match in ride_matches:
                status = match.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            print("   Status breakdown:")
            for status, count in status_counts.items():
                print(f"     - {status}: {count}")
        
        print(f"\n👥 USERS: {len(users)}")
        if users:
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
        
        print("\n" + "="*60)
        print("💰 PAYMENT ANALYSIS")
        print("="*60)
        
        # Check payments
        payments = await db.payments.find({}).to_list(None)
        payment_transactions = await db.payment_transactions.find({}).to_list(None)
        
        print(f"\n💳 PAYMENTS: {len(payments)}")
        if payments:
            total_amount = sum(p.get('amount', 0) for p in payments)
            print(f"   Total amount: ${total_amount:.2f}")
            
            status_counts = {}
            for payment in payments:
                status = payment.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            print("   Status breakdown:")
            for status, count in status_counts.items():
                print(f"     - {status}: {count}")
        
        print(f"\n🔄 PAYMENT TRANSACTIONS: {len(payment_transactions)}")
        if payment_transactions:
            total_amount = sum(p.get('amount', 0) for p in payment_transactions)
            print(f"   Total amount: ${total_amount:.2f}")
        
        print("\n" + "="*60)
        print("📝 AUDIT LOGS")
        print("="*60)
        
        # Check audit logs
        audit_logs = await db.audit_logs.find({}).to_list(None)
        print(f"\n📋 AUDIT LOGS: {len(audit_logs)}")
        
        if audit_logs:
            # Get recent audit logs
            recent_logs = sorted(audit_logs, key=lambda x: x.get('timestamp', datetime.min), reverse=True)[:5]
            print("   Recent activities:")
            for log in recent_logs:
                action = log.get('action', 'unknown')
                user_id = log.get('user_id', 'unknown')[:8] if log.get('user_id') else 'system'
                timestamp = log.get('timestamp', 'unknown')
                print(f"     - {action} by {user_id}... at {timestamp}")
        
        print("\n" + "="*60)
        print("✅ DATABASE STATE CHECK COMPLETE")
        print("="*60)
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure MongoDB is running")
        print("   2. Check your MONGO_URL in .env file")
        print("   3. Verify database name")
        print("   4. Check network connectivity")

def main():
    """Main function"""
    print("🔍 MOBILITYHUB DATABASE STATE CHECKER")
    print("="*60)
    
    # Run the async function
    asyncio.run(check_database_state())

if __name__ == "__main__":
    main()
