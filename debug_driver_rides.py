#!/usr/bin/env python3
"""
Debug script to check why driver sees 0 available rides
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.server import calculate_distance_km, Location

async def debug_driver_rides():
    """Debug driver ride matching"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.ride_sharing
    
    print("🔍 Debugging Driver Ride Matching")
    print("=" * 50)
    
    # Get the driver
    driver_id = "e330b58f-b723-44f5-b7ab-04fa2659b7eb"  # From the console logs
    driver = await db.users.find_one({"id": driver_id})
    
    if not driver:
        print(f"❌ Driver {driver_id} not found")
        return
    
    print(f"👨‍✈️ Driver: {driver.get('name', 'Unknown')}")
    print(f"📍 Driver Location: {driver.get('current_location')}")
    print(f"🟢 Driver Online: {driver.get('is_online', False)}")
    print()
    
    # Get all pending ride requests
    pending_requests = await db.ride_requests.find({
        "status": "pending",
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    }).to_list(None)
    
    print(f"📋 Found {len(pending_requests)} pending ride requests")
    print()
    
    if not driver.get("current_location"):
        print("❌ Driver has no location set!")
        return
    
    driver_location = driver["current_location"]
    available_count = 0
    
    for i, request in enumerate(pending_requests, 1):
        try:
            pickup = request["pickup_location"]
            distance = calculate_distance_km(
                Location(**driver_location), 
                Location(**pickup)
            )
            
            is_available = distance <= 10.0
            if is_available:
                available_count += 1
            
            print(f"🚗 Request {i}:")
            print(f"   📍 Pickup: {pickup.get('address', 'No address')}")
            print(f"   📍 Pickup Coords: {pickup.get('latitude')}, {pickup.get('longitude')}")
            print(f"   📏 Distance: {distance:.2f} km")
            print(f"   ✅ Available: {'Yes' if is_available else 'No'}")
            print(f"   💰 Fare: ${request.get('estimated_fare', 0):.2f}")
            print()
            
        except Exception as e:
            print(f"❌ Error processing request {i}: {e}")
            print()
    
    print("=" * 50)
    print(f"📊 Summary:")
    print(f"   Total pending requests: {len(pending_requests)}")
    print(f"   Available rides (≤10km): {available_count}")
    print(f"   Driver location: {driver_location.get('latitude')}, {driver_location.get('longitude')}")
    
    # Check if we should increase the radius
    if available_count == 0 and len(pending_requests) > 0:
        print()
        print("💡 Suggestion: Consider increasing the 10km radius limit")
        print("   Current limit: 10km")
        print("   Try: 25km or 50km for better ride matching")

if __name__ == "__main__":
    asyncio.run(debug_driver_rides())