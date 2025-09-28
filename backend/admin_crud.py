from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
import uuid
from audit_system import AuditSystem, AuditAction

# Utility function to convert ObjectIds to strings
def convert_objectids_to_strings(data):
    """Recursively convert MongoDB ObjectIds to strings for JSON serialization"""
    if isinstance(data, list):
        return [convert_objectids_to_strings(item) for item in data]
    elif isinstance(data, dict):
        converted = {}
        for key, value in data.items():
            if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
                converted[key] = str(value)
            elif isinstance(value, (dict, list)):
                converted[key] = convert_objectids_to_strings(value)
            else:
                converted[key] = value
        return converted
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
        for user in users:
            if '_id' in user:
                user['_id'] = str(user['_id'])
            # Convert any other ObjectId fields that might exist
            for key, value in user.items():
                if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
                    user[key] = str(value)
        
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
            "user": updated_user,
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
        """Get rides with advanced filtering"""
        
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
        
        total_count = await self.db.ride_matches.count_documents(query)
        
        sort_direction = -1 if filters.sort_order == "desc" else 1
        cursor = self.db.ride_matches.find(query)
        cursor = cursor.sort(filters.sort_by, sort_direction)
        cursor = cursor.skip(filters.offset).limit(filters.limit)
        
        rides = await cursor.to_list(None)
        
        # Convert MongoDB ObjectIds to strings for JSON serialization
        for ride in rides:
            if '_id' in ride:
                ride['_id'] = str(ride['_id'])
            # Convert any other ObjectId fields that might exist
            for key, value in ride.items():
                if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
                    ride[key] = str(value)
        
        # Log audit event
        await self.audit.log_action(
            action=AuditAction.ADMIN_RIDE_MODIFIED,
            user_id=admin_user_id,
            entity_type="ride_query",
            metadata={
                "action": "ride_list_accessed",
                "filters": filters.model_dump(),
                "result_count": len(rides)
            },
            severity="low"
        )
        
        return {
            "rides": rides,
            "total_count": total_count,
            "page_info": {
                "offset": filters.offset,
                "limit": filters.limit,
                "has_more": (filters.offset + len(rides)) < total_count
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
            "ride": updated_ride,
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
        for payment in payments:
            if '_id' in payment:
                payment['_id'] = str(payment['_id'])
            # Convert any other ObjectId fields that might exist
            for key, value in payment.items():
                if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
                    payment[key] = str(value)
        
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
            "payment": updated_payment,
            "modified_fields": list(update_data.keys())
        }
