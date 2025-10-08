from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
# Removed passlib import due to compatibility issues
import os
import logging
import uuid
import json
import asyncio
import time
from geopy.distance import geodesic
# from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Mock classes for development
class StripeCheckout:
    def __init__(self, api_key, webhook_url):
        self.api_key = api_key
        self.webhook_url = webhook_url
    
    def create_checkout_session(self, request):
        return {"id": "mock_session_id", "url": "https://mock-checkout.com"}

class CheckoutSessionRequest:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

class CheckoutSessionResponse:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

class CheckoutStatusResponse:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)
from dotenv import load_dotenv
from pathlib import Path

# Import comprehensive audit and admin systems
try:
    from audit_system import AuditSystem, AuditAction, AuditFilter
    from admin_crud import AdminCRUDOperations, AdminUserUpdate, AdminRideUpdate, AdminPaymentUpdate, DataFilter
    AUDIT_ENABLED = True
except ImportError as e:
    print(f"Warning: Audit system not available: {e}")
    AUDIT_ENABLED = False

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize audit system if available
if AUDIT_ENABLED:
    audit_system = AuditSystem(db)
    admin_crud = AdminCRUDOperations(db, audit_system)
else:
    audit_system = None
    admin_crud = None

# Security setup
security = HTTPBearer()
# Using a simpler hashing approach due to bcrypt compatibility issues
import hashlib
import secrets

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
JWT_SECRET = os.environ.get('JWT_SECRET')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Stripe setup
stripe_api_key = os.environ.get('STRIPE_API_KEY')

# Google Maps API Key
google_maps_api_key = os.environ.get('GOOGLE_MAPS_API_KEY')

# Create the main app
app = FastAPI(title="MobilityHub Ride-Sharing API", version="1.0.0")

# Create router with /api prefix
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

# === MODELS ===

class UserRole(str):
    RIDER = "rider"
    DRIVER = "driver"
    ADMIN = "admin"

class RideStatus(str):
    PENDING = "pending"
    MATCHED = "matched"
    ACCEPTED = "accepted"
    DRIVER_ARRIVING = "driver_arriving"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class VehicleType(str):
    ECONOMY = "economy"
    COMFORT = "comfort"
    PREMIUM = "premium"
    SUV = "suv"

class PaymentStatus(str):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class Location(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    place_id: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str
    role: str  # rider, driver, admin
    is_verified: bool = False
    rating: float = 5.0
    total_rides: int = 0
    is_online: bool = False
    current_location: Optional[Location] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    role: str = UserRole.RIDER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class DriverProfile(BaseModel):
    user_id: str
    vehicle_type: str = VehicleType.ECONOMY
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    license_plate: str
    license_number: str
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DriverProfileCreate(BaseModel):
    vehicle_type: str = VehicleType.ECONOMY
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    license_plate: str
    license_number: str

class RideRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rider_id: Optional[str] = None
    pickup_location: Location
    dropoff_location: Location
    vehicle_type: str = VehicleType.ECONOMY
    passenger_count: int = 1
    special_requirements: Optional[str] = None
    status: str = RideStatus.PENDING
    estimated_fare: float = 0.0
    estimated_duration: int = 0  # minutes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=15))

class RideUpdate(BaseModel):
    action: str  # "accept", "start", "arrive", "complete", "cancel"
    location: Optional[Location] = None
    notes: Optional[str] = None

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ride_id: str
    rider_id: str
    driver_id: Optional[str] = None
    amount: float
    platform_fee: float = 0.0
    driver_earnings: float = 0.0
    payment_method: str = "mock_card"
    status: str = PaymentStatus.PENDING
    transaction_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    metadata: Optional[dict] = None

class RideOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    current_location: Location
    available_seats: int = 4
    vehicle_type: str = VehicleType.ECONOMY
    is_available: bool = True
    price_per_km: float = 1.50
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RideMatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    offer_id: str
    rider_id: str
    driver_id: str
    pickup_location: Location
    dropoff_location: Location
    estimated_fare: float
    estimated_distance_km: float
    estimated_duration_minutes: int
    status: str = RideStatus.MATCHED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ride_id: Optional[str] = None
    user_id: str
    session_id: str
    amount: float
    currency: str = "usd"
    payment_status: str = "pending"  # pending, paid, failed, expired
    status: str = "initiated"  # initiated, processing, completed, failed
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationUpdate(BaseModel):
    user_id: Optional[str] = None
    location: Location
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RideRatingRequest(BaseModel):
    """Request model for rating a ride"""
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class RideRating(BaseModel):
    """Full rating model stored in database"""
    ride_id: str
    rater_id: str  # who is giving the rating
    rated_id: str  # who is being rated
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# === UTILITY FUNCTIONS ===

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    """Verify password using SHA-256 with salt"""
    try:
        salt, stored_hash = hashed_password.split(':')
        password_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
        return password_hash == stored_hash
    except ValueError:
        return False

def get_password_hash(password):
    """Hash password using SHA-256 with random salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"

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
    return User(**user)

def calculate_distance_km(loc1: Location, loc2: Location) -> float:
    """Calculate distance between two locations in kilometers"""
    return geodesic((loc1.latitude, loc1.longitude), (loc2.latitude, loc2.longitude)).kilometers

def calculate_fare(distance_km: float, vehicle_type: str = VehicleType.ECONOMY) -> float:
    """Calculate ride fare based on distance and vehicle type"""
    base_fare = 3.00
    rate_per_km = {
        VehicleType.ECONOMY: 1.50,
        VehicleType.COMFORT: 2.00,
        VehicleType.PREMIUM: 3.00,
        VehicleType.SUV: 2.50
    }
    return base_fare + (distance_km * rate_per_km.get(vehicle_type, 1.50))

# === WebSocket Connection Manager ===

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_locations: Dict[str, Location] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} connected to WebSocket")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_locations:
            del self.user_locations[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast_nearby(self, message: str, location: Location, radius_km: float = 5.0):
        """Broadcast message to users within radius"""
        for user_id, user_location in self.user_locations.items():
            if calculate_distance_km(location, user_location) <= radius_km:
                await self.send_personal_message(message, user_id)

manager = ConnectionManager()

# === API ENDPOINTS ===

@api_router.post("/auth/register", response_model=Dict[str, Any])
async def register(user_data: UserCreate, request: Request):
    # Get request info for audit
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        # Log failed registration attempt
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.USER_CREATED,
                entity_type="user",
                metadata={
                    "email": user_data.email,
                    "failure_reason": "email_already_exists"
                },
                ip_address=ip_address,
                user_agent=user_agent,
                severity="medium"
            )
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        role=user_data.role
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
    if AUDIT_ENABLED and audit_system:
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
            ip_address=ip_address,
            user_agent=user_agent,
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
async def login(user_credentials: UserLogin, request: Request):
    # Get request info for audit
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    user_doc = await db.users.find_one({"email": user_credentials.email})
    
    if not user_doc or not verify_password(user_credentials.password, user_doc["password"]):
        # Log failed login attempt
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.USER_LOGIN,
                entity_type="user",
                metadata={
                    "email": user_credentials.email,
                    "failure_reason": "invalid_credentials"
                },
                ip_address=ip_address,
                user_agent=user_agent,
                severity="medium"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is suspended
    if user_doc.get("status") == "suspended":
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.USER_LOGIN,
                user_id=user_doc["id"],
                entity_type="user",
                entity_id=user_doc["id"],
                metadata={
                    "email": user_credentials.email,
                    "failure_reason": "account_suspended"
                },
                ip_address=ip_address,
                user_agent=user_agent,
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
    if AUDIT_ENABLED and audit_system:
        await audit_system.log_action(
            action=AuditAction.USER_LOGIN,
            user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            metadata={
                "email": user.email,
                "role": user.role
            },
            ip_address=ip_address,
            user_agent=user_agent,
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

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/driver/profile", response_model=Dict[str, str])
async def create_driver_profile(profile_data: DriverProfileCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can create driver profiles")
    
    # Create full profile with user_id
    full_profile = DriverProfile(
        user_id=current_user.id,
        **profile_data.model_dump()
    )
    profile_dict = full_profile.model_dump()
    
    await db.driver_profiles.insert_one(profile_dict)
    return {"message": "Driver profile created successfully"}

@api_router.get("/driver/profile", response_model=DriverProfile)
async def get_driver_profile(current_user: User = Depends(get_current_user)):
    profile = await db.driver_profiles.find_one({"user_id": current_user.id})
    if not profile:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    return DriverProfile(**profile)

@api_router.post("/rides/request", response_model=Dict[str, Any])
async def create_ride_request(request_data: RideRequest, request: Request, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.RIDER:
        raise HTTPException(status_code=403, detail="Only riders can create ride requests")
    
    request_data.rider_id = current_user.id
    
    # Calculate estimated fare
    distance_km = calculate_distance_km(request_data.pickup_location, request_data.dropoff_location)
    request_data.estimated_fare = calculate_fare(distance_km, request_data.vehicle_type)
    
    request_dict = request_data.model_dump()
    await db.ride_requests.insert_one(request_dict)
    
    # Log ride request creation
    if AUDIT_ENABLED and audit_system:
        await audit_system.log_action(
            action=AuditAction.RIDE_REQUESTED,
            user_id=current_user.id,
            entity_type="ride_request",
            entity_id=request_data.id,
            new_data={
                "pickup_address": request_data.pickup_location.address,
                "dropoff_address": request_data.dropoff_location.address,
                "vehicle_type": request_data.vehicle_type,
                "estimated_fare": request_data.estimated_fare,
                "distance_km": distance_km
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            severity="medium"
        )
    
    # Find nearby available drivers
    matches = await find_nearby_drivers(request_data)
    
    # Notify nearby drivers via WebSocket
    for match in matches[:5]:  # Notify top 5 matches
        await manager.send_personal_message(
            json.dumps({
                "type": "ride_request",
                "request_id": request_data.id,
                "pickup_address": request_data.pickup_location.address,
                "dropoff_address": request_data.dropoff_location.address,
                "estimated_fare": request_data.estimated_fare,
                "distance_km": distance_km
            }),
            match["driver_id"]
        )
    
    return {
        "request_id": request_data.id,
        "estimated_fare": request_data.estimated_fare,
        "matches_found": len(matches)
    }

async def find_nearby_drivers(request: RideRequest) -> List[Dict[str, Any]]:
    """Find nearby available drivers for a ride request"""
    # Get all online drivers with matching vehicle type
    drivers = await db.users.find({
        "role": UserRole.DRIVER,
        "is_online": True,
        "current_location": {"$exists": True}
    }).to_list(None)
    
    matches = []
    for driver in drivers:
        if not driver.get("current_location"):
            continue
            
        driver_location = Location(**driver["current_location"])
        distance_km = calculate_distance_km(request.pickup_location, driver_location)
        
        if distance_km <= 10:  # Within 10km radius
            matches.append({
                "driver_id": driver["id"],
                "distance_km": distance_km,
                "rating": driver.get("rating", 5.0)
            })
    
    # Sort by distance and rating
    matches.sort(key=lambda x: (x["distance_km"], -x["rating"]))
    return matches

@api_router.post("/rides/{request_id}/accept", response_model=Dict[str, Any])
async def accept_ride_request(request_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can accept ride requests")
    
    # Get the ride request
    request_doc = await db.ride_requests.find_one({"id": request_id})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Ride request not found")
    
    if request_doc["status"] != RideStatus.PENDING:
        raise HTTPException(status_code=400, detail="Ride request is no longer available")
    
    request_obj = RideRequest(**request_doc)
    
    # Create ride match
    match = RideMatch(
        request_id=request_id,
        offer_id=str(uuid.uuid4()),  # Generate offer ID
        rider_id=request_obj.rider_id,
        driver_id=current_user.id,
        pickup_location=request_obj.pickup_location,
        dropoff_location=request_obj.dropoff_location,
        estimated_fare=request_obj.estimated_fare or 0.0,
        estimated_distance_km=calculate_distance_km(request_obj.pickup_location, request_obj.dropoff_location),
        estimated_duration_minutes=20,  # Simplified estimation
        status=RideStatus.ACCEPTED,
        accepted_at=datetime.now(timezone.utc)
    )
    
    # Update request status and driver_id
    await db.ride_requests.update_one(
        {"id": request_id}, 
        {"$set": {"status": RideStatus.ACCEPTED, "driver_id": current_user.id}}
    )
    
    # Save ride match
    await db.ride_matches.insert_one(match.model_dump())
    
    # Notify rider
    await manager.send_personal_message(
        json.dumps({
            "type": "ride_accepted",
            "match_id": match.id,
            "driver_name": current_user.name,
            "driver_rating": current_user.rating,
            "estimated_arrival": "5 minutes"
        }),
        request_obj.rider_id
    )
    
    return {
        "match_id": match.id,
        "message": "Ride request accepted successfully"
    }

@api_router.post("/rides/{request_id}/decline", response_model=Dict[str, Any])
async def decline_ride_request(request_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can decline ride requests")
    
    # Get the ride request
    request_doc = await db.ride_requests.find_one({"id": request_id})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Ride request not found")
    
    # Log the decline for analytics
    await db.ride_declines.insert_one({
        "id": str(uuid.uuid4()),
        "request_id": request_id,
        "driver_id": current_user.id,
        "declined_at": datetime.utcnow(),
        "reason": "Driver declined"
    })
    
    return {
        "message": "Ride request declined successfully"
    }

@api_router.get("/rides/my-rides", response_model=List[Dict[str, Any]])
async def get_my_rides(current_user: User = Depends(get_current_user)):
    """Get completed rides for the current user"""
    if current_user.role == UserRole.RIDER:
        rides = await db.ride_matches.find({"rider_id": current_user.id}).to_list(None)
    elif current_user.role == UserRole.DRIVER:
        rides = await db.ride_matches.find({"driver_id": current_user.id}).to_list(None)
    else:
        rides = await db.ride_matches.find({}).to_list(None)
    
    return convert_objectids_to_strings(rides)

@api_router.get("/rides/my-requests", response_model=Dict[str, Any])
async def get_my_ride_requests(current_user: User = Depends(get_current_user)):
    """Get all ride requests and matches for the current user"""
    if current_user.role == UserRole.RIDER:
        # Get pending requests
        pending_requests = await db.ride_requests.find({"rider_id": current_user.id}).to_list(None)
        # Get completed matches
        completed_matches = await db.ride_matches.find({"rider_id": current_user.id}).to_list(None)
        
        # Log audit event
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.RIDE_QUERY,
                user_id=current_user.id,
                entity_type="ride_requests",
                entity_id=f"rider_requests_{len(pending_requests)}",
                metadata={"pending_requests": len(pending_requests), "completed_rides": len(completed_matches)}
            )
        
        return {
            "pending_requests": convert_objectids_to_strings(pending_requests),
            "completed_rides": convert_objectids_to_strings(completed_matches),
            "total_pending": len(pending_requests),
            "total_completed": len(completed_matches)
        }
    
    elif current_user.role == UserRole.DRIVER:
        # Get available requests (all pending)
        available_requests = await db.ride_requests.find({"status": RideStatus.PENDING}).to_list(None)
        # Get driver's completed matches
        completed_matches = await db.ride_matches.find({"driver_id": current_user.id}).to_list(None)
        
        # Log audit event
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.RIDE_QUERY,
                user_id=current_user.id,
                entity_type="ride_requests",
                entity_id=f"driver_requests_{len(available_requests)}",
                metadata={"available_requests": len(available_requests), "completed_rides": len(completed_matches)}
            )
        
        return {
            "available_requests": convert_objectids_to_strings(available_requests),
            "completed_rides": convert_objectids_to_strings(completed_matches),
            "total_available": len(available_requests),
            "total_completed": len(completed_matches)
        }
    
    elif current_user.role == UserRole.ADMIN:
        # Admins can see everything
        all_requests = await db.ride_requests.find({}).to_list(None)
        all_matches = await db.ride_matches.find({}).to_list(None)
        
        return {
            "all_requests": convert_objectids_to_strings(all_requests),
            "all_matches": convert_objectids_to_strings(all_matches),
            "total_requests": len(all_requests),
            "total_matches": len(all_matches)
        }
    
    else:
        raise HTTPException(status_code=403, detail="Access denied")

@api_router.get("/rides/unified", response_model=Dict[str, Any])
async def get_unified_ride_data(current_user: User = Depends(get_current_user)):
    """Unified endpoint for comprehensive ride data access based on user role"""
    
    if current_user.role == UserRole.ADMIN:
        # Admins see everything
        pending_requests = await db.ride_requests.find({}).to_list(None)
        completed_matches = await db.ride_matches.find({}).to_list(None)
        
        # Get statistics
        total_users = await db.users.count_documents({})
        online_drivers = await db.users.count_documents({"role": UserRole.DRIVER, "is_online": True})
        
        # Log audit event
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.ADMIN_RIDE_MODIFIED,
                user_id=current_user.id,
                entity_type="unified_ride_query",
                entity_id=f"admin_unified_{len(pending_requests)}_{len(completed_matches)}",
                metadata={
                    "pending_requests": len(pending_requests),
                    "completed_matches": len(completed_matches),
                    "total_users": total_users,
                    "online_drivers": online_drivers
                }
            )
        
        return {
            "role": "admin",
            "pending_requests": convert_objectids_to_strings(pending_requests),
            "completed_matches": convert_objectids_to_strings(completed_matches),
            "statistics": {
                "total_pending": len(pending_requests),
                "total_completed": len(completed_matches),
                "total_rides": len(pending_requests) + len(completed_matches),
                "total_users": total_users,
                "online_drivers": online_drivers
            }
        }
    
    elif current_user.role == UserRole.RIDER:
        # Riders see their requests and matches
        pending_requests = await db.ride_requests.find({"rider_id": current_user.id}).to_list(None)
        completed_matches = await db.ride_matches.find({"rider_id": current_user.id}).to_list(None)
        
        # Log audit event
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.RIDE_QUERY,
                user_id=current_user.id,
                entity_type="unified_ride_query",
                entity_id=f"rider_unified_{len(pending_requests)}_{len(completed_matches)}",
                metadata={
                    "pending_requests": len(pending_requests),
                    "completed_matches": len(completed_matches)
                }
            )
        
        return {
            "role": "rider",
            "pending_requests": convert_objectids_to_strings(pending_requests),
            "completed_matches": convert_objectids_to_strings(completed_matches),
            "statistics": {
                "total_pending": len(pending_requests),
                "total_completed": len(completed_matches),
                "total_rides": len(pending_requests) + len(completed_matches)
            }
        }
    
    elif current_user.role == UserRole.DRIVER:
        # Drivers see available requests and their matches
        available_requests = await db.ride_requests.find({"status": RideStatus.PENDING}).to_list(None)
        completed_matches = await db.ride_matches.find({"driver_id": current_user.id}).to_list(None)
        
        # Get driver location for distance calculations
        driver = await db.users.find_one({"id": current_user.id})
        driver_location = driver.get("current_location") if driver else None
        
        # Calculate distances for available requests
        if driver_location:
            for request in available_requests:
                pickup = request["pickup_location"]
                distance = calculate_distance_km(
                    Location(**driver_location), Location(**pickup)
                )
                request["distance_to_pickup"] = round(distance, 2)
                request["estimated_pickup_time"] = int(distance * 2)
        
        # Log audit event
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.RIDE_QUERY,
                user_id=current_user.id,
                entity_type="unified_ride_query",
                entity_id=f"driver_unified_{len(available_requests)}_{len(completed_matches)}",
                metadata={
                    "available_requests": len(available_requests),
                    "completed_matches": len(completed_matches),
                    "driver_online": driver.get("is_online", False) if driver else False
                }
            )
        
        return {
            "role": "driver",
            "available_requests": convert_objectids_to_strings(available_requests),
            "completed_matches": convert_objectids_to_strings(completed_matches),
            "driver_info": {
                "is_online": driver.get("is_online", False) if driver else False,
                "current_location": driver_location
            },
            "statistics": {
                "total_available": len(available_requests),
                "total_completed": len(completed_matches),
                "total_rides": len(available_requests) + len(completed_matches)
            }
        }
    
    else:
        raise HTTPException(status_code=403, detail="Access denied")

@api_router.post("/rides/{match_id}/start", response_model=Dict[str, str])
async def start_ride(match_id: str, current_user: User = Depends(get_current_user)):
    """Driver starts the ride"""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can start rides")
    
    match_doc = await db.ride_matches.find_one({"id": match_id})
    if not match_doc:
        raise HTTPException(status_code=404, detail="Ride match not found")
    
    if match_doc["driver_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to start this ride")
    
    # Update ride status
    await db.ride_matches.update_one(
        {"id": match_id},
        {"$set": {"status": RideStatus.IN_PROGRESS, "started_at": datetime.now(timezone.utc)}}
    )
    
    # Notify rider
    await manager.send_personal_message(
        json.dumps({
            "type": "ride_started",
            "match_id": match_id,
            "driver_name": current_user.name,
            "message": "Your ride has started! Enjoy your journey."
        }),
        match_doc["rider_id"]
    )
    
    return {"message": "Ride started successfully"}

@api_router.post("/rides/{match_id}/arrived", response_model=Dict[str, str])
async def driver_arrived(match_id: str, current_user: User = Depends(get_current_user)):
    """Driver notifies they have arrived at pickup location"""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can mark arrival")
    
    match_doc = await db.ride_matches.find_one({"id": match_id})
    if not match_doc:
        raise HTTPException(status_code=404, detail="Ride match not found")
    
    if match_doc["driver_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to mark arrival for this ride")
    
    # Update ride status
    await db.ride_matches.update_one(
        {"id": match_id},
        {"$set": {"status": RideStatus.DRIVER_ARRIVING, "arrived_at": datetime.now(timezone.utc)}}
    )
    
    # Notify rider
    await manager.send_personal_message(
        json.dumps({
            "type": "driver_arrived",
            "match_id": match_id,
            "driver_name": current_user.name,
            "driver_phone": current_user.phone,
            "vehicle_info": getattr(current_user, 'vehicle_info', 'Standard vehicle'),
            "message": "Your driver has arrived at the pickup location"
        }),
        match_doc["rider_id"]
    )
    
    return {"message": "Arrival notification sent successfully"}

@api_router.post("/rides/{match_id}/message", response_model=Dict[str, str])
async def send_ride_message(match_id: str, message_data: dict, current_user: User = Depends(get_current_user)):
    """Send a message between driver and rider during a ride"""
    match_doc = await db.ride_matches.find_one({"id": match_id})
    if not match_doc:
        raise HTTPException(status_code=404, detail="Ride match not found")
    
    # Check if user is part of this ride
    if current_user.id not in [match_doc["driver_id"], match_doc["rider_id"]]:
        raise HTTPException(status_code=403, detail="Unauthorized to send messages for this ride")
    
    # Determine recipient
    recipient_id = match_doc["rider_id"] if current_user.id == match_doc["driver_id"] else match_doc["driver_id"]
    
    # Save message to database
    message_record = {
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "sender_id": current_user.id,
        "recipient_id": recipient_id,
        "message": message_data.get("message", ""),
        "message_type": message_data.get("type", "text"),
        "sent_at": datetime.now(timezone.utc)
    }
    
    await db.ride_messages.insert_one(message_record)
    
    # Send real-time notification
    await manager.send_personal_message(
        json.dumps({
            "type": "ride_message",
            "match_id": match_id,
            "sender_name": current_user.name,
            "sender_role": current_user.role,
            "message": message_data.get("message", ""),
            "message_type": message_data.get("type", "text"),
            "sent_at": message_record["sent_at"].isoformat()
        }),
        recipient_id
    )
    
    return {"message": "Message sent successfully"}

@api_router.post("/rides/{match_id}/complete", response_model=Dict[str, str])
async def complete_ride(match_id: str, current_user: User = Depends(get_current_user)):
    match_doc = await db.ride_matches.find_one({"id": match_id})
    if not match_doc:
        raise HTTPException(status_code=404, detail="Ride match not found")
    
    # Only driver or rider can complete the ride
    if current_user.id not in [match_doc["driver_id"], match_doc["rider_id"]]:
        raise HTTPException(status_code=403, detail="Unauthorized to complete this ride")
    
    # Update ride status
    await db.ride_matches.update_one(
        {"id": match_id},
        {
            "$set": {
                "status": RideStatus.COMPLETED,
                "completed_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "Ride completed successfully"}

@api_router.post("/rides/{match_id}/rate", response_model=Dict[str, str])
async def rate_ride(match_id: str, rating_request: RideRatingRequest, current_user: User = Depends(get_current_user)):
    try:
        logger.info(f"Rating ride {match_id} by user {current_user.id}")
        
        match_doc = await db.ride_matches.find_one({"id": match_id})
        if not match_doc:
            logger.error(f"Ride match {match_id} not found")
            raise HTTPException(status_code=404, detail="Ride match not found")
        
        logger.info(f"Found ride match: {match_doc}")
        
        # Determine who is being rated first
        rated_id = None
        if current_user.id == match_doc["rider_id"]:
            rated_id = match_doc["driver_id"]
        elif current_user.id == match_doc["driver_id"]:
            rated_id = match_doc["rider_id"]
        else:
            logger.error(f"User {current_user.id} not authorized to rate ride {match_id}")
            raise HTTPException(status_code=403, detail="Unauthorized to rate this ride")
        
        # Create the full rating object
        rating_data = RideRating(
            ride_id=match_id,
            rater_id=current_user.id,
            rated_id=rated_id,
            rating=rating_request.rating,
            comment=rating_request.comment
        )
        
        logger.info(f"Rating data: {rating_data.model_dump()}")
        
        # Insert rating into database
        result = await db.ratings.insert_one(rating_data.model_dump())
        logger.info(f"Rating inserted with ID: {result.inserted_id}")
        
        # Update user's average rating
        await update_user_rating(rating_data.rated_id)
        logger.info(f"Updated rating for user {rating_data.rated_id}")
        
        return {"message": "Rating submitted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rating ride {match_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def update_user_rating(user_id: str):
    """Update user's average rating based on all ratings received"""
    ratings = await db.ratings.find({"rated_id": user_id}).to_list(None)
    if ratings:
        avg_rating = sum(r["rating"] for r in ratings) / len(ratings)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"rating": round(avg_rating, 1)}}
        )

@api_router.post("/location/update", response_model=Dict[str, str])
async def update_location(location_data: LocationUpdate, current_user: User = Depends(get_current_user)):
    location_data.user_id = current_user.id
    
    # Update user's current location
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$set": {
                "current_location": location_data.location.model_dump(),
                "is_online": True
            }
        }
    )
    
    # Store in location history
    await db.location_history.insert_one(location_data.model_dump())
    
    # Update WebSocket manager
    manager.user_locations[current_user.id] = location_data.location
    
    return {"message": "Location updated successfully"}

@api_router.post("/driver/online", response_model=Dict[str, Any])
async def set_driver_online(current_user: User = Depends(get_current_user)):
    """Set driver online status to true"""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can set online status")
    
    # Simply set online status to true
    result = await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"is_online": True}}
    )
    
    if result.matched_count == 0:
        logger.error(f"Driver {current_user.id} not found in database")
        raise HTTPException(status_code=404, detail="Driver not found")
    
    logger.info(f"Driver {current_user.id} set to online (matched={result.matched_count}, modified={result.modified_count})")
    
    return {"message": "Driver is now online", "status": "online"}

@api_router.post("/driver/offline", response_model=Dict[str, Any])
async def set_driver_offline(current_user: User = Depends(get_current_user)):
    """Set driver online status to false"""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can set offline status")
    
    # Get current status from database to ensure accuracy
    user_doc = await db.users.find_one({"id": current_user.id})
    current_status = user_doc.get("is_online", False) if user_doc else False
    
    # Set online status to false
    new_status = False
    
    # Update database
    result = await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"is_online": new_status}}
    )
    
    # Verify the update
    updated_user = await db.users.find_one({"id": current_user.id})
    actual_status = updated_user.get("is_online", False) if updated_user else False
    
    logger.info(f"Driver {current_user.id} online status: {current_status} -> {new_status} (actual: {actual_status})")
    
    return {"message": f"Driver is now offline", "status": "offline"}

@api_router.get("/driver/preferences", response_model=Dict[str, Any])
async def get_driver_preferences(current_user: User = Depends(get_current_user)):
    """Get driver preferences including radius settings"""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can access preferences")
    
    driver = await db.users.find_one({"id": current_user.id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    preferences = driver.get("preferences", {})
    return {
        "radius_km": preferences.get("radius_km", 25),  # Default 25km
        "auto_accept": preferences.get("auto_accept", False),
        "notifications_enabled": preferences.get("notifications_enabled", True),
        "current_location": driver.get("current_location"),
        "is_online": driver.get("is_online", False)
    }

@api_router.post("/driver/preferences", response_model=Dict[str, Any])
async def update_driver_preferences(
    preferences: Dict[str, Any], 
    current_user: User = Depends(get_current_user)
):
    """Update driver preferences including radius settings"""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can update preferences")
    
    # Validate radius (between 5km and 50km)
    radius_km = preferences.get("radius_km", 25)
    if not isinstance(radius_km, (int, float)) or radius_km < 5 or radius_km > 50:
        raise HTTPException(status_code=400, detail="Radius must be between 5 and 50 kilometers")
    
    # Update driver preferences
    result = await db.users.update_one(
        {"id": current_user.id},
        {
            "$set": {
                "preferences": {
                    "radius_km": radius_km,
                    "auto_accept": preferences.get("auto_accept", False),
                    "notifications_enabled": preferences.get("notifications_enabled", True),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    logger.info(f"Driver {current_user.id} preferences updated: radius={radius_km}km")
    
    return {"message": "Preferences updated successfully", "radius_km": radius_km}

# === RIDE ENDPOINTS ===

@api_router.get("/rides/available", response_model=Dict[str, Any])
async def get_available_rides(current_user: User = Depends(get_current_user)):
    """Get available rides for drivers with enhanced visibility"""
    try:
        logger.info(f"Driver {current_user.id} requesting available rides")
        
        if current_user.role != UserRole.DRIVER:
            raise HTTPException(status_code=403, detail="Only drivers can view available rides")
        
        # Get driver location and preferences
        driver = await db.users.find_one({"id": current_user.id})
        if not driver:
            logger.error(f"Driver {current_user.id} not found in database")
            raise HTTPException(status_code=404, detail="Driver not found")
            
        if not driver.get("current_location"):
            logger.warning(f"Driver {current_user.id} has no location set")
            raise HTTPException(status_code=400, detail="Driver location not set. Please update your location first.")
        
        if not driver.get("is_online", False):
            logger.warning(f"Driver {current_user.id} is not online")
            raise HTTPException(status_code=400, detail="Driver must be online to view available rides")
        
        # Get driver's preferred radius (default 25km)
        preferences = driver.get("preferences", {})
        radius_km = preferences.get("radius_km", 25)
        
        logger.info(f"Driver {current_user.id} is online and has location set, radius: {radius_km}km")
        
        # Find pending ride requests
        pending_requests = await db.ride_requests.find({
            "status": RideStatus.PENDING,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        }).to_list(None)
        
        logger.info(f"Found {len(pending_requests)} pending ride requests")
        
        available_rides = []
        all_requests = []
        driver_location = driver["current_location"]
        
        for request in pending_requests:
            try:
                # Calculate distance to pickup
                pickup = request["pickup_location"]
                distance = calculate_distance_km(
                    Location(**driver_location), Location(**pickup)
                )
                
                # Add distance info to all requests
                ride_info = convert_objectids_to_strings(request)
                ride_info["distance_to_pickup"] = round(distance, 2)
                ride_info["estimated_pickup_time"] = int(distance * 2)  # 2 minutes per km estimate
                all_requests.append(ride_info)
                
                # Only show rides within driver's preferred radius
                if distance <= radius_km:
                    available_rides.append(ride_info)
            except Exception as e:
                logger.error(f"Error processing ride request {request.get('id', 'unknown')}: {e}")
                continue
        
        # Sort by distance
        available_rides.sort(key=lambda x: x["distance_to_pickup"])
        all_requests.sort(key=lambda x: x["distance_to_pickup"])
        
        logger.info(f"Returning {len(available_rides)} available rides and {len(all_requests)} total requests")
        
        # Log audit event
        if AUDIT_ENABLED and audit_system:
            try:
                await audit_system.log_action(
                    action=AuditAction.RIDE_QUERY,
                    user_id=current_user.id,
                    entity_type="ride_discovery",
                    entity_id=f"available_rides_{len(available_rides)}",
                    metadata={"rides_found": len(available_rides), "driver_online": True}
                )
            except Exception as e:
                logger.warning(f"Failed to log audit event: {e}")
        
        return {
            "available_rides": available_rides,
            "all_pending_requests": all_requests,
            "total_available": len(available_rides),
            "total_pending": len(all_requests),
            "driver_location": driver_location,
            "radius_km": radius_km
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_available_rides for driver {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching available rides")

@api_router.post("/rides/{ride_id}/update", response_model=Dict[str, Any])
async def update_ride_status(ride_id: str, update: RideUpdate, current_user: User = Depends(get_current_user)):
    """Update ride status - used by drivers and riders"""
    
    # Get the ride request
    ride = await db.ride_requests.find_one({"id": ride_id})
    if not ride:
        ride = await db.ride_matches.find_one({"id": ride_id})
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
    
    current_status = ride.get("status", RideStatus.PENDING)
    action = update.action.lower()
    
    # Validate permissions and state transitions
    if action == "accept":
        if current_user.role != UserRole.DRIVER:
            raise HTTPException(status_code=403, detail="Only drivers can accept rides")
        if current_status != RideStatus.PENDING:
            raise HTTPException(status_code=400, detail="Ride is no longer available")
        
        # Create ride match
        match_data = {
            "id": str(uuid.uuid4()),
            "ride_request_id": ride_id,
            "rider_id": ride["rider_id"],
            "driver_id": current_user.id,
            "status": RideStatus.ACCEPTED,
            "accepted_at": datetime.now(timezone.utc),
            "pickup_location": ride["pickup_location"],
            "dropoff_location": ride["dropoff_location"],
            "vehicle_type": ride["vehicle_type"],
            "estimated_fare": ride["estimated_fare"],
            "passenger_count": ride["passenger_count"]
        }
        
        await db.ride_matches.insert_one(match_data)
        await db.ride_requests.update_one({"id": ride_id}, {"$set": {"status": RideStatus.ACCEPTED, "driver_id": current_user.id}})
        
        # Log audit
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.RIDE_ACCEPTED,
                user_id=current_user.id,
                entity_type="ride_match",
                entity_id=match_data["id"],
                metadata={"ride_request_id": ride_id, "fare": ride["estimated_fare"]}
            )
        
        return {"message": "Ride accepted successfully", "match_id": match_data["id"], "status": RideStatus.ACCEPTED}
    
    elif action == "arrive":
        if current_user.role != UserRole.DRIVER:
            raise HTTPException(status_code=403, detail="Only drivers can update arrival status")
        if current_status not in [RideStatus.ACCEPTED]:
            raise HTTPException(status_code=400, detail="Invalid status transition")
        
        await db.ride_matches.update_one(
            {"id": ride_id, "driver_id": current_user.id},
            {
                "$set": {
                    "status": RideStatus.DRIVER_ARRIVING,
                    "driver_arrived_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {"message": "Driver arrival status updated", "status": RideStatus.DRIVER_ARRIVING}
    
    elif action == "start":
        if current_user.role != UserRole.DRIVER:
            raise HTTPException(status_code=403, detail="Only drivers can start rides")
        if current_status not in [RideStatus.ACCEPTED, RideStatus.DRIVER_ARRIVING]:
            raise HTTPException(status_code=400, detail="Invalid status transition")
        
        await db.ride_matches.update_one(
            {"id": ride_id, "driver_id": current_user.id},
            {
                "$set": {
                    "status": RideStatus.IN_PROGRESS,
                    "started_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Log audit
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.RIDE_STARTED,
                user_id=current_user.id,
                entity_type="ride_match",
                entity_id=ride_id,
                metadata={"started_at": datetime.now(timezone.utc).isoformat()}
            )
        
        return {"message": "Ride started successfully", "status": RideStatus.IN_PROGRESS}
    
    elif action == "complete":
        if current_user.role != UserRole.DRIVER:
            raise HTTPException(status_code=403, detail="Only drivers can complete rides")
        if current_status != RideStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Ride must be in progress to complete")
        
        completed_at = datetime.now(timezone.utc)
        
        # Update ride status
        await db.ride_matches.update_one(
            {"id": ride_id, "driver_id": current_user.id},
            {
                "$set": {
                    "status": RideStatus.COMPLETED,
                    "completed_at": completed_at,
                    "completion_notes": update.notes
                }
            }
        )
        
        # Get updated ride for payment processing
        completed_ride = await db.ride_matches.find_one({"id": ride_id})
        
        # Create payment record
        payment_data = {
            "id": str(uuid.uuid4()),
            "ride_id": ride_id,
            "rider_id": completed_ride["rider_id"],
            "driver_id": current_user.id,
            "amount": completed_ride["estimated_fare"],
            "platform_fee": completed_ride["estimated_fare"] * 0.20,  # 20% platform fee
            "driver_earnings": completed_ride["estimated_fare"] * 0.80,  # 80% to driver
            "payment_method": "mock_card",
            "status": PaymentStatus.PENDING,
            "transaction_id": f"txn_{int(time.time())}_{ride_id[:8]}",
            "created_at": completed_at,
            "metadata": {
                "ride_completed_at": completed_at.isoformat(),
                "completion_notes": update.notes
            }
        }
        
        await db.payments.insert_one(payment_data)
        
        # Log audit for ride completion
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.RIDE_COMPLETED,
                user_id=current_user.id,
                entity_type="ride_match",
                entity_id=ride_id,
                metadata={
                    "completed_at": completed_at.isoformat(),
                    "fare": completed_ride["estimated_fare"],
                    "payment_id": payment_data["id"]
                }
            )
        
        return {
            "message": "Ride completed successfully", 
            "status": RideStatus.COMPLETED,
            "payment_id": payment_data["id"],
            "amount": payment_data["amount"],
            "driver_earnings": payment_data["driver_earnings"]
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

# === PAYMENT ENDPOINTS ===

@api_router.post("/payments/{payment_id}/process", response_model=Dict[str, Any])
async def process_payment(payment_id: str, current_user: User = Depends(get_current_user)):
    """Process payment (mock implementation)"""
    
    # Get payment record
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Validate user can process this payment
    if current_user.role not in [UserRole.RIDER, UserRole.ADMIN] and current_user.id != payment["rider_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to process this payment")
    
    if payment["status"] != PaymentStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Payment already {payment['status']}")
    
    # Mock payment processing
    processing_time = datetime.now(timezone.utc)
    success = True  # Mock always succeeds for now
    
    if success:
        # Update payment status
        await db.payments.update_one(
            {"id": payment_id},
            {
                "$set": {
                    "status": PaymentStatus.COMPLETED,
                    "completed_at": processing_time,
                    "processed_at": processing_time
                }
            }
        )
        
        # Update driver earnings
        driver_id = payment["driver_id"]
        if driver_id:
            await db.users.update_one(
                {"id": driver_id},
                {
                    "$inc": {
                        "total_earnings": payment["driver_earnings"],
                        "completed_rides": 1
                    }
                }
            )
        
        # Update platform revenue
        platform_earnings = payment["platform_fee"]
        
        # Log audit for payment completion
        if AUDIT_ENABLED and audit_system:
            await audit_system.log_action(
                action=AuditAction.PAYMENT_COMPLETED,
                user_id=current_user.id,
                entity_type="payment",
                entity_id=payment_id,
                severity="medium",
                metadata={
                    "amount": payment["amount"],
                    "driver_earnings": payment["driver_earnings"],
                    "platform_fee": payment["platform_fee"],
                    "transaction_id": payment["transaction_id"],
                    "completed_at": processing_time.isoformat()
                }
            )
        
        return {
            "message": "Payment processed successfully",
            "payment_id": payment_id,
            "status": PaymentStatus.COMPLETED,
            "amount": payment["amount"],
            "transaction_id": payment["transaction_id"]
        }
    else:
        # Payment failed (future implementation)
        await db.payments.update_one(
            {"id": payment_id},
            {"$set": {"status": PaymentStatus.FAILED, "failed_at": processing_time}}
        )
        
        return {"message": "Payment failed", "status": PaymentStatus.FAILED}

@api_router.get("/payments", response_model=List[Dict[str, Any]])
async def get_user_payments(current_user: User = Depends(get_current_user)):
    """Get user's payment history"""
    
    if current_user.role == UserRole.RIDER:
        query = {"rider_id": current_user.id}
    elif current_user.role == UserRole.DRIVER:
        query = {"driver_id": current_user.id}
    elif current_user.role == UserRole.ADMIN:
        query = {}  # Admins can see all payments
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    payments = await db.payments.find(query).sort("created_at", -1).limit(50).to_list(None)
    
    # Convert ObjectIds and add summary info
    payment_list = convert_objectids_to_strings(payments)
    
    # Log audit
    if AUDIT_ENABLED and audit_system:
        await audit_system.log_action(
            action=AuditAction.PAYMENT_QUERY,
            user_id=current_user.id,
            entity_type="payment_history",
            entity_id=f"payments_{len(payment_list)}",
            metadata={"payments_found": len(payment_list)}
        )
    
    return payment_list

@api_router.get("/payments/summary", response_model=Dict[str, Any])
async def get_payment_summary(current_user: User = Depends(get_current_user)):
    """Get payment summary and revenue calculation"""
    
    if current_user.role == UserRole.DRIVER:
        # Driver earnings summary - include both completed and pending payments
        pipeline = [
            {"$match": {"driver_id": current_user.id, "status": {"$in": [PaymentStatus.COMPLETED, PaymentStatus.PENDING]}}},
            {"$group": {
                "_id": None,
                "total_earnings": {"$sum": "$driver_earnings"},
                "total_rides": {"$sum": 1},
                "total_revenue": {"$sum": "$amount"}
            }}
        ]
    elif current_user.role == UserRole.ADMIN:
        # Platform revenue summary
        pipeline = [
            {"$match": {"status": PaymentStatus.COMPLETED}},
            {"$group": {
                "_id": None,
                "total_platform_revenue": {"$sum": "$platform_fee"},
                "total_driver_earnings": {"$sum": "$driver_earnings"},
                "total_gross_revenue": {"$sum": "$amount"},
                "total_transactions": {"$sum": 1}
            }}
        ]
    else:
        # Rider spending summary
        pipeline = [
            {"$match": {"rider_id": current_user.id, "status": PaymentStatus.COMPLETED}},
            {"$group": {
                "_id": None,
                "total_spent": {"$sum": "$amount"},
                "total_rides": {"$sum": 1}
            }}
        ]
    
    try:
        result = await db.payments.aggregate(pipeline).to_list(None)
        summary = result[0] if result else {}
        
        # Remove the _id field
        summary.pop("_id", None)
        
        # Add default values for empty results
        if current_user.role == UserRole.DRIVER:
            summary.setdefault("total_earnings", 0)
            summary.setdefault("total_rides", 0)
            summary.setdefault("total_revenue", 0)
        elif current_user.role == UserRole.ADMIN:
            summary.setdefault("total_platform_revenue", 0)
            summary.setdefault("total_driver_earnings", 0)
            summary.setdefault("total_gross_revenue", 0)
            summary.setdefault("total_transactions", 0)
        else:
            summary.setdefault("total_spent", 0)
            summary.setdefault("total_rides", 0)
        
        return summary
        
    except Exception as e:
        # Return empty summary if aggregation fails
        if current_user.role == UserRole.DRIVER:
            return {"total_earnings": 0, "total_rides": 0, "total_revenue": 0}
        elif current_user.role == UserRole.ADMIN:
            return {"total_platform_revenue": 0, "total_driver_earnings": 0, "total_gross_revenue": 0, "total_transactions": 0}
        else:
            return {"total_spent": 0, "total_rides": 0}

@api_router.post("/payments/create-session", response_model=Dict[str, Any])
async def create_payment_session(
    request: Request,
    ride_id: str,
    current_user: User = Depends(get_current_user)
):
    # Get ride details
    ride = await db.ride_matches.find_one({"id": ride_id})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride["rider_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to pay for this ride")
    
    # Get host URL from request
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    # Initialize Stripe checkout
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create success and cancel URLs
    success_url = f"{host_url.replace('/api', '')}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url.replace('/api', '')}/rides"
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=float(ride["estimated_fare"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "ride_id": ride_id,
            "user_id": current_user.id,
            "type": "ride_payment"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Store payment transaction
    transaction = PaymentTransaction(
        ride_id=ride_id,
        user_id=current_user.id,
        session_id=session.session_id,
        amount=float(ride["estimated_fare"]),
        currency="usd",
        payment_status="pending",
        status="initiated",
        metadata={
            "ride_id": ride_id,
            "user_id": current_user.id
        }
    )
    
    await db.payment_transactions.insert_one(transaction.model_dump())
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id
    }

@api_router.get("/payments/status/{session_id}", response_model=Dict[str, Any])
async def get_payment_status(session_id: str, current_user: User = Depends(get_current_user)):
    # Get transaction from database
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment session not found")
    
    if transaction["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this payment")
    
    # Check with Stripe
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    status_response = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction if status changed
    if status_response.payment_status != transaction["payment_status"]:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": status_response.payment_status,
                    "status": "completed" if status_response.payment_status == "paid" else "failed",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # If payment successful, mark ride as paid
        if status_response.payment_status == "paid" and transaction.get("ride_id"):
            await db.ride_matches.update_one(
                {"id": transaction["ride_id"]},
                {"$set": {"payment_status": "paid"}}
            )
    
    return {
        "payment_status": status_response.payment_status,
        "amount": status_response.amount_total / 100,  # Convert from cents
        "currency": status_response.currency
    }

@api_router.post("/webhook/stripe", include_in_schema=False)
async def stripe_webhook(request: Request):
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": webhook_response.session_id},
            {
                "$set": {
                    "payment_status": webhook_response.payment_status,
                    "status": "completed" if webhook_response.payment_status == "paid" else "failed",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")

# === WEBSOCKET ENDPOINT ===

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "location_update":
                location = Location(**message_data["location"])
                manager.user_locations[user_id] = location
                
                # Update user location in database
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {"current_location": location.model_dump()}}
                )
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# === ADMIN ENDPOINTS ===

@api_router.post("/admin/notifications/send", response_model=Dict[str, str])
async def admin_send_notification(
    user_id: str,
    message: str,
    notification_type: str = "admin_message",
    current_user: User = Depends(get_current_user)
):
    """Admin sends notification to specific user"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify user exists
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Send notification via WebSocket
    await manager.send_personal_message(
        json.dumps({
            "type": notification_type,
            "message": message,
            "from_admin": True,
            "admin_name": current_user.name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }),
        user_id
    )
    
    # Log the admin action
    if AUDIT_ENABLED and audit_system:
        await audit_system.log_action(
            action=AuditAction.ADMIN_SYSTEM_CONFIG_CHANGED,
            user_id=current_user.id,
            entity_type="notification",
            entity_id=user_id,
            metadata={"message": message, "notification_type": notification_type}
        )
    
    return {"message": f"Notification sent to user {user_id} successfully"}

@api_router.post("/admin/rides/{ride_id}/notify", response_model=Dict[str, str])
async def admin_notify_ride_participants(
    ride_id: str,
    message: str,
    target: str,  # "rider", "driver", or "both"
    current_user: User = Depends(get_current_user)
):
    """Admin sends notification to ride participants"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find the ride (could be in ride_requests or ride_matches)
    ride_doc = await db.ride_requests.find_one({"id": ride_id})
    if not ride_doc:
        ride_doc = await db.ride_matches.find_one({"id": ride_id})
        if not ride_doc:
            raise HTTPException(status_code=404, detail="Ride not found")
    
    # Get participant IDs
    rider_id = ride_doc.get("rider_id")
    driver_id = ride_doc.get("driver_id")
    
    if not rider_id:
        raise HTTPException(status_code=400, detail="Ride has no rider")
    
    notification_data = {
        "type": "admin_ride_message",
        "message": message,
        "from_admin": True,
        "admin_name": current_user.name,
        "ride_id": ride_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    sent_count = 0
    
    # Send to rider
    if target in ["rider", "both"] and rider_id:
        await manager.send_personal_message(
            json.dumps(notification_data),
            rider_id
        )
        sent_count += 1
    
    # Send to driver
    if target in ["driver", "both"] and driver_id:
        await manager.send_personal_message(
            json.dumps(notification_data),
            driver_id
        )
        sent_count += 1
    
    # Log the admin action
    if AUDIT_ENABLED and audit_system:
        await audit_system.log_action(
            action=AuditAction.ADMIN_SYSTEM_CONFIG_CHANGED,
            user_id=current_user.id,
            entity_type="ride_notification",
            entity_id=ride_id,
            metadata={"message": message, "target": target, "sent_count": sent_count}
        )
    
    return {"message": f"Notification sent to {sent_count} participant(s) successfully"}

@api_router.get("/admin/users", response_model=List[Dict[str, Any]])
async def get_all_users(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"password": 0}).to_list(None)
    
    # Convert MongoDB ObjectIds to strings for JSON serialization
    users = convert_objectids_to_strings(users)
    
    return users

@api_router.get("/admin/rides", response_model=Dict[str, Any])
async def get_all_rides(current_user: User = Depends(get_current_user)):
    """Get all ride requests and matches for admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all pending requests
    pending_requests = await db.ride_requests.find({}).to_list(None)
    # Get all completed matches
    completed_matches = await db.ride_matches.find({}).to_list(None)
    
    # Log audit event
    if AUDIT_ENABLED and audit_system:
        await audit_system.log_action(
            action=AuditAction.ADMIN_RIDE_MODIFIED,
            user_id=current_user.id,
            entity_type="admin_ride_query",
            entity_id=f"admin_rides_{len(pending_requests)}_{len(completed_matches)}",
            metadata={"pending_requests": len(pending_requests), "completed_matches": len(completed_matches)}
        )
    
    return {
        "pending_requests": convert_objectids_to_strings(pending_requests),
        "completed_matches": convert_objectids_to_strings(completed_matches),
        "total_pending": len(pending_requests),
        "total_completed": len(completed_matches),
        "total_rides": len(pending_requests) + len(completed_matches)
    }

@api_router.get("/admin/stats", response_model=Dict[str, Any])
async def get_platform_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_drivers = await db.users.count_documents({"role": UserRole.DRIVER})
    total_riders = await db.users.count_documents({"role": UserRole.RIDER})
    total_rides = await db.ride_matches.count_documents({})
    completed_rides = await db.ride_matches.count_documents({"status": RideStatus.COMPLETED})
    online_drivers = await db.users.count_documents({"role": UserRole.DRIVER, "is_online": True})
    
    # Calculate total revenue
    completed_ride_docs = await db.ride_matches.find({"status": RideStatus.COMPLETED}).to_list(None)
    total_revenue = sum(ride.get("estimated_fare", 0) for ride in completed_ride_docs)
    
    # Get audit statistics if available
    audit_stats = {}
    if AUDIT_ENABLED and audit_system:
        try:
            audit_stats = await audit_system.get_audit_statistics()
        except Exception as e:
            logger.warning(f"Failed to get audit statistics: {e}")
    
    return {
        "total_users": total_users,
        "total_drivers": total_drivers,
        "total_riders": total_riders,
        "total_rides": total_rides,
        "completed_rides": completed_rides,
        "online_drivers": online_drivers,
        "total_revenue": round(total_revenue, 2),
        "completion_rate": round((completed_rides / total_rides * 100) if total_rides > 0 else 0, 1),
        "audit_statistics": audit_stats
    }

# ========== COMPREHENSIVE ADMIN CRUD ENDPOINTS ==========

@api_router.get("/admin/users/filtered", response_model=Dict[str, Any])
async def get_users_with_filters(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user)
):
    """Enhanced user listing with filtering and searching"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not AUDIT_ENABLED or not admin_crud:
        raise HTTPException(status_code=503, detail="Admin CRUD system not available")
    
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

@api_router.put("/admin/users/{user_id}/update", response_model=Dict[str, Any])
async def admin_update_user(
    user_id: str,
    name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    is_verified: Optional[bool] = None,
    is_online: Optional[bool] = None,
    rating: Optional[float] = None,
    status: Optional[str] = None,
    admin_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update user details with comprehensive audit trail"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not AUDIT_ENABLED or not admin_crud:
        raise HTTPException(status_code=503, detail="Admin CRUD system not available")
    
    updates = AdminUserUpdate(
        name=name,
        email=email,
        phone=phone,
        is_verified=is_verified,
        is_online=is_online,
        rating=rating,
        status=status
    )
    
    return await admin_crud.update_user(user_id, updates, current_user.id, admin_notes)

@api_router.post("/admin/users/{user_id}/suspend", response_model=Dict[str, str])
async def admin_suspend_user(
    user_id: str,
    reason: str,
    duration_days: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Suspend user account with audit trail"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not AUDIT_ENABLED or not admin_crud:
        raise HTTPException(status_code=503, detail="Admin CRUD system not available")
    
    return await admin_crud.suspend_user(user_id, current_user.id, reason, duration_days)

@api_router.get("/admin/rides/filtered", response_model=Dict[str, Any])
async def get_rides_with_filters(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user)
):
    """Enhanced ride listing with filtering and searching"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not AUDIT_ENABLED or not admin_crud:
        raise HTTPException(status_code=503, detail="Admin CRUD system not available")
    
    filters = DataFilter(
        search_term=search,
        status=status,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return await admin_crud.get_rides_filtered(filters, current_user.id)

@api_router.put("/admin/rides/{ride_id}/update", response_model=Dict[str, Any])
async def admin_update_ride(
    ride_id: str,
    status: Optional[str] = None,
    estimated_fare: Optional[float] = None,
    notes: Optional[str] = None,
    admin_override: Optional[bool] = None,
    admin_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update ride details with comprehensive audit trail"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not AUDIT_ENABLED or not admin_crud:
        raise HTTPException(status_code=503, detail="Admin CRUD system not available")
    
    updates = AdminRideUpdate(
        status=status,
        estimated_fare=estimated_fare,
        notes=notes,
        admin_override=admin_override
    )
    
    return await admin_crud.update_ride(ride_id, updates, current_user.id, admin_notes)

@api_router.get("/admin/payments/filtered", response_model=Dict[str, Any])
async def get_payments_with_filters(
    search: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user)
):
    """Enhanced payment transaction listing with filtering and searching"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not AUDIT_ENABLED or not admin_crud:
        raise HTTPException(status_code=503, detail="Admin CRUD system not available")
    
    filters = DataFilter(
        search_term=search,
        status=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return await admin_crud.get_payments_filtered(filters, current_user.id)

@api_router.put("/admin/payments/{payment_id}/update", response_model=Dict[str, Any])
async def admin_update_payment(
    payment_id: str,
    status: Optional[str] = None,
    notes: Optional[str] = None,
    refund_amount: Optional[float] = None,
    admin_action: Optional[str] = None,
    admin_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update payment transaction with comprehensive audit trail"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not AUDIT_ENABLED or not admin_crud:
        raise HTTPException(status_code=503, detail="Admin CRUD system not available")
    
    updates = AdminPaymentUpdate(
        status=status,
        notes=notes,
        refund_amount=refund_amount,
        admin_action=admin_action
    )
    
    return await admin_crud.update_payment(payment_id, updates, current_user.id, admin_notes)

# ========== AUDIT LOG ENDPOINTS ==========

@api_router.get("/audit/logs", response_model=List[Dict[str, Any]])
async def get_audit_logs(
    user_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
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
    """Get audit logs with comprehensive filtering - available to all roles for their own data"""
    if not AUDIT_ENABLED or not audit_system:
        raise HTTPException(status_code=503, detail="Audit system not available")
    
    # Non-admin users can only see their own audit logs
    if current_user.role != UserRole.ADMIN:
        user_id = current_user.id
        target_user_id = current_user.id
    
    filters = AuditFilter(
        user_id=user_id,
        target_user_id=target_user_id,
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

@api_router.get("/audit/statistics", response_model=Dict[str, Any])
async def get_audit_statistics(current_user: User = Depends(get_current_user)):
    """Get comprehensive audit statistics - admin only"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not AUDIT_ENABLED or not audit_system:
        raise HTTPException(status_code=503, detail="Audit system not available")
    
    return await audit_system.get_audit_statistics()

# === BASIC HEALTH CHECK ===

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "MobilityHub API", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with database connectivity"""
    try:
        # Test database connectivity
        await db.users.count_documents({})
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "service": "MobilityHub API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "audit_enabled": AUDIT_ENABLED,
        "admin_crud_enabled": admin_crud is not None
    }

@api_router.get("/config")
async def get_config():
    return {
        "google_maps_api_key": google_maps_api_key,
        "features": {
            "real_time_tracking": True,
            "payments": True,
            "ratings": True,
            "admin_panel": True
        }
    }

# Include router in the main app
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
