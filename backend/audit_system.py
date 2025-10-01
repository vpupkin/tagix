from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import uuid
import json
from motor.motor_asyncio import AsyncIOMotorDatabase

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

class AuditAction:
    # User actions
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    PASSWORD_CHANGED = "password_changed"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    
    # Ride actions
    RIDE_REQUESTED = "ride_requested"
    RIDE_ACCEPTED = "ride_accepted"
    RIDE_STARTED = "ride_started"
    RIDE_COMPLETED = "ride_completed"
    RIDE_CANCELLED = "ride_cancelled"
    RIDE_QUERY = "ride_query"
    RIDE_RATED = "ride_rated"
    
    # Driver actions
    DRIVER_PROFILE_CREATED = "driver_profile_created"
    DRIVER_PROFILE_UPDATED = "driver_profile_updated"
    DRIVER_STATUS_CHANGED = "driver_status_changed"
    DRIVER_LOCATION_UPDATED = "driver_location_updated"
    
    # Payment actions
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_REFUNDED = "payment_refunded"
    
    # Admin actions
    ADMIN_USER_MODIFIED = "admin_user_modified"
    ADMIN_RIDE_MODIFIED = "admin_ride_modified"
    ADMIN_PAYMENT_MODIFIED = "admin_payment_modified"
    ADMIN_SYSTEM_CONFIG_CHANGED = "admin_system_config_changed"

class AuditRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    action: str  # from AuditAction
    user_id: Optional[str] = None  # who performed the action
    target_user_id: Optional[str] = None  # who was affected (if different)
    entity_type: str  # "user", "ride", "payment", "driver_profile", etc.
    entity_id: Optional[str] = None  # ID of affected entity
    old_data: Optional[Dict[str, Any]] = None  # previous state
    new_data: Optional[Dict[str, Any]] = None  # new state
    metadata: Optional[Dict[str, Any]] = None  # additional context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    severity: str = "info"  # "low", "medium", "high", "critical"
    
class AuditFilter(BaseModel):
    user_id: Optional[str] = None
    target_user_id: Optional[str] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    severity: Optional[str] = None
    search_term: Optional[str] = None
    limit: int = 50
    offset: int = 0

class AuditSystem:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.audit_logs
        
    async def log_action(
        self,
        action: str,
        user_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        entity_type: str = "unknown",
        entity_id: Optional[str] = None,
        old_data: Optional[Dict[str, Any]] = None,
        new_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        severity: str = "info"
    ) -> str:
        """Log an audit event - Add-Once/Keep-Forever principle"""
        
        # Sanitize sensitive data
        if old_data:
            old_data = self._sanitize_data(old_data)
        if new_data:
            new_data = self._sanitize_data(new_data)
            
        audit_record = AuditRecord(
            action=action,
            user_id=user_id,
            target_user_id=target_user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            old_data=old_data,
            new_data=new_data,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            severity=severity
        )
        
        # Insert as immutable record
        result = await self.collection.insert_one(audit_record.model_dump())
        return audit_record.id
    
    def _sanitize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive fields from audit logs"""
        sensitive_fields = {"password", "token", "secret", "key", "card_number", "cvv"}
        sanitized = {}
        
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_data(value)
            else:
                sanitized[key] = value
                
        return sanitized
    
    async def get_audit_logs(
        self,
        filters: AuditFilter,
        user_role: str = "admin"
    ) -> List[Dict[str, Any]]:
        """Get audit logs with filtering and searching"""
        
        # Build MongoDB query
        query = {}
        
        if filters.user_id:
            query["user_id"] = filters.user_id
        if filters.target_user_id:
            query["target_user_id"] = filters.target_user_id
        if filters.action:
            query["action"] = filters.action
        if filters.entity_type:
            query["entity_type"] = filters.entity_type
        if filters.entity_id:
            query["entity_id"] = filters.entity_id
        if filters.severity:
            query["severity"] = filters.severity
            
        # Date range filter
        if filters.start_date or filters.end_date:
            date_filter = {}
            if filters.start_date:
                date_filter["$gte"] = filters.start_date
            if filters.end_date:
                date_filter["$lte"] = filters.end_date
            query["timestamp"] = date_filter
            
        # Text search across multiple fields
        if filters.search_term:
            query["$or"] = [
                {"action": {"$regex": filters.search_term, "$options": "i"}},
                {"entity_type": {"$regex": filters.search_term, "$options": "i"}},
                {"metadata.description": {"$regex": filters.search_term, "$options": "i"}}
            ]
        
        # Role-based filtering
        if user_role != "admin":
            # Non-admin users can only see their own audit logs
            query["$or"] = [
                {"user_id": filters.user_id},
                {"target_user_id": filters.user_id}
            ]
            
        # Execute query with pagination
        cursor = self.collection.find(query)
        cursor = cursor.sort("timestamp", -1)  # Most recent first
        cursor = cursor.skip(filters.offset).limit(filters.limit)
        
        results = await cursor.to_list(None)
        
        # Convert MongoDB ObjectIds to strings for JSON serialization
        results = convert_objectids_to_strings(results)
        
        return results
    
    async def get_audit_statistics(self) -> Dict[str, Any]:
        """Get audit statistics for admin dashboard"""
        
        pipeline = [
            {
                "$group": {
                    "_id": "$action",
                    "count": {"$sum": 1},
                    "latest": {"$max": "$timestamp"}
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        action_stats = await self.collection.aggregate(pipeline).to_list(None)
        
        # Get severity distribution
        severity_pipeline = [
            {
                "$group": {
                    "_id": "$severity",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        severity_stats = await self.collection.aggregate(severity_pipeline).to_list(None)
        
        # Get total count
        total_logs = await self.collection.count_documents({})
        
        # Get recent activity (last 24 hours)
        recent_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_activity = await self.collection.count_documents({
            "timestamp": {"$gte": recent_cutoff}
        })
        
        return {
            "total_audit_logs": total_logs,
            "recent_activity_24h": recent_activity,
            "action_distribution": action_stats,
            "severity_distribution": severity_stats
        }
    
    async def ensure_indexes(self):
        """Create indexes for efficient querying"""
        await self.collection.create_index("timestamp")
        await self.collection.create_index("user_id")
        await self.collection.create_index("action")
        await self.collection.create_index("entity_type")
        await self.collection.create_index("entity_id")
        await self.collection.create_index("severity")
        await self.collection.create_index([("action", 1), ("timestamp", -1)])
        await self.collection.create_index([("user_id", 1), ("timestamp", -1)])
