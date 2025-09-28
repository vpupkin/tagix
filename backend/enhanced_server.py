# Enhanced server.py with comprehensive audit trails and admin CRUD operations

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import os
import logging
import uuid
import json
import asyncio
from geopy.distance import geodesic
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from dotenv import load_dotenv
from pathlib import Path

# Import our new audit and admin systems
from audit_system import AuditSystem, AuditAction, AuditFilter, AuditRecord
from admin_crud import AdminCRUDOperations, AdminUserUpdate, AdminRideUpdate, AdminPaymentUpdate, DataFilter

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize audit system
audit_system = AuditSystem(db)
admin_crud = AdminCRUDOperations(db, audit_system)

# Security setup
security = HTTPBearer()
import hashlib
import secrets
JWT_SECRET = os.environ.get('JWT_SECRET')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# External APIs
stripe_api_key = os.environ.get('STRIPE_API_KEY')
google_maps_api_key = os.environ.get('GOOGLE_MAPS_API_KEY')

# Create the main app
app = FastAPI(title="MobilityHub Ride-Sharing API with Comprehensive Audit", version="2.0.0")
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========== ENHANCED MODELS ==========

class UserRole(str):
    RIDER = "rider"
    DRIVER = "driver"
    ADMIN = "admin"

class RideStatus(str):
    PENDING = "pending"
    MATCHED = "matched"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str
    role: str
    is_verified: bool = False
    rating: float = 5.0
    total_rides: int = 0
    is_online: bool = False
    status: str = "active"  # active, suspended, banned
    current_location: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== UTILITY FUNCTIONS WITH AUDIT ==========

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        salt, password_hash = hashed_password.split(':')
        return hashlib.sha256((password + salt).encode()).hexdigest() == password_hash
    except ValueError:
        return False

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**{k: v for k, v in user.items() if k != "password"})

async def get_request_info(request: Request) -> Dict[str, Any]:
    """Extract request information for audit logging"""
    return {
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
        "method": request.method,
        "url": str(request.url)
    }

# ========== ENHANCED API ENDPOINTS WITH AUDIT ==========

@api_router.post("/auth/register", response_model=Dict[str, Any])
async def register(user_data: dict, request: Request):
    request_info = await get_request_info(request)
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        # Log failed registration attempt
        await audit_system.log_action(
            action=AuditAction.USER_CREATED,
            entity_type="user",
            metadata={
                "email": user_data["email"],
                "failure_reason": "email_already_exists"
            },
            ip_address=request_info["ip_address"],
            user_agent=request_info["user_agent"],
            severity="medium"
        )
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = hash_password(user_data["password"])
    user = User(
        email=user_data["email"],
        name=user_data["name"],
        phone=user_data["phone"],
        role=user_data.get("role", UserRole.RIDER)
    )
    
    user_dict = user.model_dump()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role}, expires_delta=access_token_expires
    )
    
    # Log successful registration
    await audit_system.log_action(
        action=AuditAction.USER_CREATED,
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        new_data={
            "email": user.email,
            "name": user.name,
            "role": user.role
        },
        ip_address=request_info["ip_address"],
        user_agent=request_info["user_agent"],
        severity="medium"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@api_router.post("/auth/login", response_model=Dict[str, Any])
async def login(user_credentials: dict, request: Request):
    request_info = await get_request_info(request)
    
    user_doc = await db.users.find_one({"email": user_credentials["email"]})
    
    if not user_doc or not verify_password(user_credentials["password"], user_doc["password"]):
        # Log failed login attempt
        await audit_system.log_action(
            action=AuditAction.USER_LOGIN,
            entity_type="user",
            metadata={
                "email": user_credentials["email"],
                "failure_reason": "invalid_credentials"
            },
            ip_address=request_info["ip_address"],
            user_agent=request_info["user_agent"],
            severity="medium"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is suspended
    if user_doc.get("status") == "suspended":
        await audit_system.log_action(
            action=AuditAction.USER_LOGIN,
            user_id=user_doc["id"],
            entity_type="user",
            entity_id=user_doc["id"],
            metadata={
                "email": user_credentials["email"],
                "failure_reason": "account_suspended"
            },
            ip_address=request_info["ip_address"],
            user_agent=request_info["user_agent"],
            severity="high"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password"})
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role}, expires_delta=access_token_expires
    )
    
    # Log successful login
    await audit_system.log_action(
        action=AuditAction.USER_LOGIN,
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        metadata={
            "email": user.email,
            "role": user.role
        },
        ip_address=request_info["ip_address"],
        user_agent=request_info["user_agent"],
        severity="low"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

# ========== ENHANCED ADMIN ENDPOINTS ==========

@api_router.get("/admin/users", response_model=Dict[str, Any])
async def get_users_admin(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    filters = DataFilter(
        search_term=search,
        user_role=role,
        status=status,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return await admin_crud.get_users_filtered(filters, current_user.id)

@api_router.put("/admin/users/{user_id}", response_model=Dict[str, Any])
async def update_user_admin(
    user_id: str,
    updates: AdminUserUpdate,
    admin_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return await admin_crud.update_user(user_id, updates, current_user.id, admin_notes)

@api_router.post("/admin/users/{user_id}/suspend", response_model=Dict[str, str])
async def suspend_user_admin(
    user_id: str,
    reason: str,
    duration_days: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return await admin_crud.suspend_user(user_id, current_user.id, reason, duration_days)

@api_router.get("/admin/rides", response_model=Dict[str, Any])
async def get_rides_admin(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    filters = DataFilter(
        search_term=search,
        status=status,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return await admin_crud.get_rides_filtered(filters, current_user.id)

@api_router.put("/admin/rides/{ride_id}", response_model=Dict[str, Any])
async def update_ride_admin(
    ride_id: str,
    updates: AdminRideUpdate,
    admin_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return await admin_crud.update_ride(ride_id, updates, current_user.id, admin_notes)

@api_router.get("/admin/payments", response_model=Dict[str, Any])
async def get_payments_admin(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    filters = DataFilter(
        search_term=search,
        status=status,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return await admin_crud.get_payments_filtered(filters, current_user.id)

@api_router.put("/admin/payments/{payment_id}", response_model=Dict[str, Any])
async def update_payment_admin(
    payment_id: str,
    updates: AdminPaymentUpdate,
    admin_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return await admin_crud.update_payment(payment_id, updates, current_user.id, admin_notes)

# ========== AUDIT ENDPOINTS ==========

@api_router.get("/audit/logs", response_model=List[Dict[str, Any]])
async def get_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Get audit logs with filtering - available to all roles for their own data"""
    
    filters = AuditFilter(
        user_id=user_id if current_user.role == UserRole.ADMIN else current_user.id,
        action=action,
        entity_type=entity_type,
        start_date=start_date,
        end_date=end_date,
        severity=severity,
        search_term=search,
        limit=limit,
        offset=offset
    )
    
    return await audit_system.get_audit_logs(filters, current_user.role)

@api_router.get("/audit/stats", response_model=Dict[str, Any])
async def get_audit_statistics(current_user: User = Depends(get_current_user)):
    """Get audit statistics - admin only"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return await audit_system.get_audit_statistics()

# ========== INITIALIZATION ==========

@app.on_event("startup")
async def startup_event():
    """Initialize indexes and audit system"""
    await audit_system.ensure_indexes()
    logger.info("MobilityHub API with comprehensive audit system started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include router in the main app
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
