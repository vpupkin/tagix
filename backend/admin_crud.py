from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
import uuid
from audit_system import AuditSystem, AuditAction

# Utility function to convert ObjectIds and datetime objects to strings
def convert_objectids_to_strings(data):
    """Recursively convert MongoDB ObjectIds and datetime objects to strings for JSON serialization"""
    from datetime import datetime, date
    
    if isinstance(data, list):
        return [convert_objectids_to_strings(item) for item in data]
    elif isinstance(data, dict):
        converted = {}
        for key, value in data.items():
            if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
                converted[key] = str(value)
            elif isinstance(value, datetime):
                converted[key] = value.isoformat()
            elif isinstance(value, date):
                converted[key] = value.isoformat()
            elif isinstance(value, (dict, list)):
                converted[key] = convert_objectids_to_strings(value)
            else:
                converted[key] = value
        return converted
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, date):
        return data.isoformat()
    else:
        return data

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_verified: Optional[bool] = None
    is_online: Optional[bool] = None
    rating: Optional[float] = None
    status: Optional[str] = None  # active, suspended, banned

class AdminRideUpdate(BaseModel):
    status: Optional[str] = None
    estimated_fare: Optional[float] = None
    notes: Optional[str] = None
    admin_override: Optional[bool] = None

class AdminDriverProfileUpdate(BaseModel):
    is_approved: Optional[bool] = None
    vehicle_type: Optional[str] = None
    notes: Optional[str] = None
    background_check_status: Optional[str] = None

class AdminPaymentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    refund_amount: Optional[float] = None
    admin_action: Optional[str] = None

class DataFilter(BaseModel):
    search_term: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_role: Optional[str] = None
    limit: int = 50
    offset: int = 0
    sort_by: str = "created_at"
    sort_order: str = "desc"  # asc or desc

class AdminCRUDOperations:
    def __init__(self, db: AsyncIOMotorDatabase, audit_system: AuditSystem):
        self.db = db
        self.audit = audit_system
    
    # ========== USER MANAGEMENT ==========
    
    async def get_users_filtered(
        self, 
        filters: DataFilter,
        admin_user_id: str
    ) -> Dict[str, Any]:
        """Get users with advanced filtering and searching"""
        
        query = {}
        
        # Search across multiple fields
        if filters.search_term:
            query["$or"] = [
                {"name": {"$regex": filters.search_term, "$options": "i"}},
                {"email": {"$regex": filters.search_term, "$options": "i"}},
                {"phone": {"$regex": filters.search_term, "$options": "i"}}
            ]
        
        if filters.user_role:
            query["role"] = filters.user_role
        
        if filters.status:
            query["status"] = filters.status
        
        # Date range filter
        if filters.start_date or filters.end_date:
            date_filter = {}
            if filters.start_date:
                date_filter["$gte"] = filters.start_date
            if filters.end_date:
                date_filter["$lte"] = filters.end_date
            query["created_at"] = date_filter
        
        # Get total count for pagination
        total_count = await self.db.users.count_documents(query)
        
        # Execute query with pagination and sorting
        sort_direction = -1 if filters.sort_order == "desc" else 1
        cursor = self.db.users.find(query, {"password": 0})  # Exclude password
        cursor = cursor.sort(filters.sort_by, sort_direction)
        cursor = cursor.skip(filters.offset).limit(filters.limit)
        
        users = await cursor.to_list(None)
        
        # Convert MongoDB ObjectIds to strings for JSON serialization
        users = convert_objectids_to_strings(users)
        
        # Log audit event
        await self.audit.log_action(
            action=AuditAction.ADMIN_USER_MODIFIED,
            user_id=admin_user_id,
            entity_type="user_query",
            metadata={
                "action": "user_list_accessed",
                "filters": filters.model_dump(),
                "result_count": len(users)
            },
            severity="low"
        )
        
        return {
            "users": users,
            "total_count": total_count,
            "page_info": {
                "offset": filters.offset,
                "limit": filters.limit,
                "has_more": (filters.offset + len(users)) < total_count
            }
        }
    
    async def update_user(
        self, 
        user_id: str, 
        updates: AdminUserUpdate, 
        admin_user_id: str,
        admin_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update user with full audit trail"""
        
        # Get current user data for audit
        current_user = await self.db.users.find_one({"id": user_id})
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare update data (only non-None fields)
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid updates provided")
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Perform update
        result = await self.db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get updated user data
        updated_user = await self.db.users.find_one({"id": user_id}, {"password": 0})
        
        # Create audit log
        await self.audit.log_action(
            action=AuditAction.ADMIN_USER_MODIFIED,
            user_id=admin_user_id,
            target_user_id=user_id,
            entity_type="user",
            entity_id=user_id,
            old_data={k: current_user.get(k) for k in update_data.keys()},
            new_data=update_data,
            metadata={
                "admin_notes": admin_notes,
                "modified_fields": list(update_data.keys())
            },
            severity="medium"
        )
        
        return {
            "message": "User updated successfully",
            "user": convert_objectids_to_strings(updated_user),
            "modified_fields": list(update_data.keys())
        }
    
    async def suspend_user(
        self, 
        user_id: str, 
        admin_user_id: str, 
        reason: str,
        duration_days: Optional[int] = None
    ) -> Dict[str, str]:
        """Suspend user account with audit trail"""
        
        current_user = await self.db.users.find_one({"id": user_id})
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        suspension_data = {
            "status": "suspended",
            "suspended_at": datetime.now(timezone.utc),
            "suspension_reason": reason,
            "suspended_by": admin_user_id,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if duration_days:
            suspension_data["suspension_expires_at"] = datetime.now(timezone.utc) + timedelta(days=duration_days)
        
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": suspension_data}
        )
        
        # Create audit log
        await self.audit.log_action(
            action=AuditAction.ADMIN_USER_MODIFIED,
            user_id=admin_user_id,
            target_user_id=user_id,
            entity_type="user",
            entity_id=user_id,
            old_data={"status": current_user.get("status", "active")},
            new_data=suspension_data,
            metadata={
                "action_type": "user_suspension",
                "reason": reason,
                "duration_days": duration_days
            },
            severity="high"
        )
        
        return {"message": f"User suspended successfully. Reason: {reason}"}
    
    # ========== RIDE MANAGEMENT ==========
    
    async def get_rides_filtered(
        self, 
        filters: DataFilter,
        admin_user_id: str
    ) -> Dict[str, Any]:
        """Get rides with advanced filtering - includes both requests and matches"""
        
        query = {}
        
        if filters.search_term:
            # Search in pickup/dropoff addresses and ride IDs
            query["$or"] = [
                {"id": {"$regex": filters.search_term, "$options": "i"}},
                {"pickup_location.address": {"$regex": filters.search_term, "$options": "i"}},
                {"dropoff_location.address": {"$regex": filters.search_term, "$options": "i"}}
            ]
        
        if filters.status:
            query["status"] = filters.status
        
        if filters.start_date or filters.end_date:
            date_filter = {}
            if filters.start_date:
                date_filter["$gte"] = filters.start_date
            if filters.end_date:
                date_filter["$lte"] = filters.end_date
            query["created_at"] = date_filter
        
        # Get pending requests
        pending_query = query.copy()
        pending_count = await self.db.ride_requests.count_documents(pending_query)
        
        sort_direction = -1 if filters.sort_order == "desc" else 1
        pending_cursor = self.db.ride_requests.find(pending_query)
        pending_cursor = pending_cursor.sort(filters.sort_by, sort_direction)
        pending_cursor = pending_cursor.skip(filters.offset).limit(filters.limit)
        pending_requests = await pending_cursor.to_list(None)
        
        # Get completed matches
        matches_query = query.copy()
        matches_count = await self.db.ride_matches.count_documents(matches_query)
        
        matches_cursor = self.db.ride_matches.find(matches_query)
        matches_cursor = matches_cursor.sort(filters.sort_by, sort_direction)
        matches_cursor = matches_cursor.skip(filters.offset).limit(filters.limit)
        completed_matches = await matches_cursor.to_list(None)
        
        # Convert MongoDB ObjectIds to strings for JSON serialization
        pending_requests = convert_objectids_to_strings(pending_requests)
        completed_matches = convert_objectids_to_strings(completed_matches)
        
        # Populate driver names for both pending requests and completed matches
        all_driver_ids = set()
        for request in pending_requests:
            if request.get('driver_id'):
                all_driver_ids.add(request['driver_id'])
        for match in completed_matches:
            if match.get('driver_id'):
                all_driver_ids.add(match['driver_id'])
        
        # Batch fetch driver information
        drivers = {}
        if all_driver_ids:
            driver_cursor = self.db.users.find({"id": {"$in": list(all_driver_ids)}})
            driver_list = await driver_cursor.to_list(None)
            for driver in driver_list:
                drivers[driver['id']] = {
                    'name': driver.get('name', 'Unknown Driver'),
                    'email': driver.get('email', 'Unknown Email')
                }
        
        # Add driver names to pending requests
        for request in pending_requests:
            if request.get('driver_id') and request['driver_id'] in drivers:
                request['driver_name'] = drivers[request['driver_id']]['name']
                request['driver_email'] = drivers[request['driver_id']]['email']
            else:
                request['driver_name'] = 'Unassigned'
                request['driver_email'] = 'N/A'
        
        # Add driver names to completed matches
        for match in completed_matches:
            if match.get('driver_id') and match['driver_id'] in drivers:
                match['driver_name'] = drivers[match['driver_id']]['name']
                match['driver_email'] = drivers[match['driver_id']]['email']
            else:
                match['driver_name'] = 'Unassigned'
                match['driver_email'] = 'N/A'
        
        # Populate rider names for both pending requests and completed matches
        all_ride_ids = set()
        for ride in pending_requests:
            if ride.get('rider_id'):
                all_ride_ids.add(ride['rider_id'])
        for match in completed_matches:
            if match.get('rider_id'):
                all_ride_ids.add(match['rider_id'])
        
        # Batch fetch rider information
        riders = {}
        if all_ride_ids:
            rider_cursor = self.db.users.find({"id": {"$in": list(all_ride_ids)}})
            rider_list = await rider_cursor.to_list(None)
            for rider in rider_list:
                riders[rider['id']] = {
                    'name': rider.get('name', 'Unknown Rider'),
                    'email': rider.get('email', 'Unknown Email')
                }
        
        # Add rider names to pending requests
        for request in pending_requests:
            if request.get('rider_id') and request['rider_id'] in riders:
                request['rider_name'] = riders[request['rider_id']]['name']
                request['rider_email'] = riders[request['rider_id']]['email']
            else:
                request['rider_name'] = 'Rider Not Found'
                request['rider_email'] = 'Unknown Email'
        
        # Add rider names to completed matches
        for match in completed_matches:
            if match.get('rider_id') and match['rider_id'] in riders:
                match['rider_name'] = riders[match['rider_id']]['name']
                match['rider_email'] = riders[match['rider_id']]['email']
            else:
                match['rider_name'] = 'Rider Not Found'
                match['rider_email'] = 'Unknown Email'
        
        total_count = pending_count + matches_count
        
        # Log audit event
        await self.audit.log_action(
            action=AuditAction.ADMIN_RIDE_MODIFIED,
            user_id=admin_user_id,
            entity_type="ride_query",
            metadata={
                "action": "ride_list_accessed",
                "filters": filters.model_dump(),
                "pending_requests": len(pending_requests),
                "completed_matches": len(completed_matches),
                "total_count": total_count
            },
            severity="low"
        )
        
        return {
            "pending_requests": pending_requests,
            "completed_matches": completed_matches,
            "total_pending": pending_count,
            "total_completed": matches_count,
            "total_count": total_count,
            "page_info": {
                "offset": filters.offset,
                "limit": filters.limit,
                "has_more": (filters.offset + len(pending_requests) + len(completed_matches)) < total_count
            }
        }
    
    async def update_ride(
        self, 
        ride_id: str, 
        updates: AdminRideUpdate, 
        admin_user_id: str,
        admin_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update ride with audit trail"""
        
        current_ride = await self.db.ride_matches.find_one({"id": ride_id})
        if not current_ride:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid updates provided")
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["admin_modified"] = True
        
        result = await self.db.ride_matches.update_one(
            {"id": ride_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        updated_ride = await self.db.ride_matches.find_one({"id": ride_id})
        
        # Create audit log
        await self.audit.log_action(
            action=AuditAction.ADMIN_RIDE_MODIFIED,
            user_id=admin_user_id,
            entity_type="ride",
            entity_id=ride_id,
            old_data={k: current_ride.get(k) for k in update_data.keys()},
            new_data=update_data,
            metadata={
                "admin_notes": admin_notes,
                "modified_fields": list(update_data.keys()),
                "rider_id": current_ride.get("rider_id"),
                "driver_id": current_ride.get("driver_id")
            },
            severity="medium"
        )
        
        return {
            "message": "Ride updated successfully",
            "ride": convert_objectids_to_strings(updated_ride),
            "modified_fields": list(update_data.keys())
        }
    
    # ========== PAYMENT MANAGEMENT ==========
    
    async def get_payments_filtered(
        self, 
        filters: DataFilter,
        admin_user_id: str
    ) -> Dict[str, Any]:
        """Get payment transactions with advanced filtering"""
        
        query = {}
        
        if filters.search_term:
            query["$or"] = [
                {"session_id": {"$regex": filters.search_term, "$options": "i"}},
                {"ride_id": {"$regex": filters.search_term, "$options": "i"}},
                {"user_id": {"$regex": filters.search_term, "$options": "i"}}
            ]
        
        if filters.status:
            query["payment_status"] = filters.status
        
        if filters.start_date or filters.end_date:
            date_filter = {}
            if filters.start_date:
                date_filter["$gte"] = filters.start_date
            if filters.end_date:
                date_filter["$lte"] = filters.end_date
            query["created_at"] = date_filter
        
        total_count = await self.db.payment_transactions.count_documents(query)
        
        sort_direction = -1 if filters.sort_order == "desc" else 1
        cursor = self.db.payment_transactions.find(query)
        cursor = cursor.sort(filters.sort_by, sort_direction)
        cursor = cursor.skip(filters.offset).limit(filters.limit)
        
        payments = await cursor.to_list(None)
        
        # Convert MongoDB ObjectIds to strings for JSON serialization
        payments = convert_objectids_to_strings(payments)
        
        # Populate driver and rider names for payments
        all_user_ids = set()
        for payment in payments:
            if payment.get('driver_id'):
                all_user_ids.add(payment['driver_id'])
            if payment.get('rider_id'):
                all_user_ids.add(payment['rider_id'])
        
        # Batch fetch user information
        users = {}
        if all_user_ids:
            user_cursor = self.db.users.find({"id": {"$in": list(all_user_ids)}})
            user_list = await user_cursor.to_list(None)
            for user in user_list:
                users[user['id']] = {
                    'name': user.get('name', 'Unknown User'),
                    'email': user.get('email', 'Unknown Email')
                }
        
        # Add user names to payments
        for payment in payments:
            if payment.get('driver_id') and payment['driver_id'] in users:
                payment['driver_name'] = users[payment['driver_id']]['name']
                payment['driver_email'] = users[payment['driver_id']]['email']
            else:
                payment['driver_name'] = 'Unknown Driver'
                payment['driver_email'] = 'Unknown Email'
            
            if payment.get('rider_id') and payment['rider_id'] in users:
                payment['rider_name'] = users[payment['rider_id']]['name']
                payment['rider_email'] = users[payment['rider_id']]['email']
            else:
                payment['rider_name'] = 'Unknown Rider'
                payment['rider_email'] = 'Unknown Email'
        
        # Calculate summary statistics
        total_amount = await self.db.payment_transactions.aggregate([
            {"$match": query},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(None)
        
        total_revenue = total_amount[0]["total"] if total_amount else 0
        
        # Log audit event
        await self.audit.log_action(
            action=AuditAction.ADMIN_PAYMENT_MODIFIED,
            user_id=admin_user_id,
            entity_type="payment_query",
            metadata={
                "action": "payment_list_accessed",
                "filters": filters.model_dump(),
                "result_count": len(payments),
                "total_revenue_queried": total_revenue
            },
            severity="low"
        )
        
        return {
            "payments": payments,
            "total_count": total_count,
            "total_revenue": total_revenue,
            "page_info": {
                "offset": filters.offset,
                "limit": filters.limit,
                "has_more": (filters.offset + len(payments)) < total_count
            }
        }
    
    async def update_payment(
        self, 
        payment_id: str, 
        updates: AdminPaymentUpdate, 
        admin_user_id: str,
        admin_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update payment transaction with audit trail"""
        
        current_payment = await self.db.payment_transactions.find_one({"id": payment_id})
        if not current_payment:
            raise HTTPException(status_code=404, detail="Payment transaction not found")
        
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid updates provided")
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["admin_modified"] = True
        
        result = await self.db.payment_transactions.update_one(
            {"id": payment_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Payment transaction not found")
        
        updated_payment = await self.db.payment_transactions.find_one({"id": payment_id})
        
        # Create audit log
        await self.audit.log_action(
            action=AuditAction.ADMIN_PAYMENT_MODIFIED,
            user_id=admin_user_id,
            entity_type="payment",
            entity_id=payment_id,
            old_data={k: current_payment.get(k) for k in update_data.keys()},
            new_data=update_data,
            metadata={
                "admin_notes": admin_notes,
                "modified_fields": list(update_data.keys()),
                "amount": current_payment.get("amount"),
                "user_id": current_payment.get("user_id")
            },
            severity="high"
        )
        
        return {
            "message": "Payment transaction updated successfully",
            "payment": convert_objectids_to_strings(updated_payment),
            "modified_fields": list(update_data.keys())
        }
