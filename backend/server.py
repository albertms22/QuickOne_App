from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta
import json
import base64
import httpx

from models import (
    User, UserCreate, UserLogin, UserUpdate, Token,
    Service, ServiceCreate, ServiceUpdate,
    Booking, BookingCreate, BookingStatusUpdate,
    Message, MessageCreate,
    Review, ReviewCreate,
    ProviderProfile, ProviderProfileUpdate,
    Transaction, Withdrawal, WithdrawalRequest, WithdrawalAction,
    EmailVerificationRequest, EmailVerificationCode,
    PriceOffer, PriceOfferCreate, PriceOfferResponse,
    ServiceDescriptionRequest, ServiceDescriptionResponse
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user_id, get_admin_user
)
from database import (
    users_collection, services_collection, bookings_collection,
    messages_collection, reviews_collection, transactions_collection,
    provider_profiles_collection, notifications_collection, withdrawals_collection,
    price_offers_collection
)
from categories import get_categories
from emergentintegrations.llm.chat import LlmChat, UserMessage
from email_service import email_service
import random
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="QuickOne Marketplace API")
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, booking_id: str):
        await websocket.accept()
        if booking_id not in self.active_connections:
            self.active_connections[booking_id] = []
        self.active_connections[booking_id].append(websocket)

    def disconnect(self, websocket: WebSocket, booking_id: str):
        if booking_id in self.active_connections:
            self.active_connections[booking_id].remove(websocket)

    async def send_message(self, message: dict, booking_id: str):
        if booking_id in self.active_connections:
            for connection in self.active_connections[booking_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

# ============ HELPER FUNCTIONS ============

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using Haversine formula
    Returns distance in kilometers
    """
    # Radius of Earth in kilometers
    R = 6371.0
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    lon1_rad = math.radians(lon1)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return round(distance, 2)

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate verification code
    verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    code_expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict['password'] = get_password_hash(user_data.password)
    user_obj = User(**{k: v for k, v in user_dict.items() if k != 'password'})
    
    doc = user_obj.model_dump()
    doc['password'] = user_dict['password']
    doc['email_verification_code'] = verification_code
    doc['code_expires_at'] = code_expires_at.isoformat()
    doc['code_resend_count'] = 0
    doc['last_code_sent_at'] = datetime.utcnow().isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await users_collection.insert_one(doc)
    
    # Create provider profile if user is provider
    if user_obj.user_type == "provider":
        profile = ProviderProfile(user_id=user_obj.id)
        profile_doc = profile.model_dump()
        profile_doc['created_at'] = profile_doc['created_at'].isoformat()
        await provider_profiles_collection.insert_one(profile_doc)
    
    # Send verification code via email
    try:
        await email_service.send_verification_code(
            user_obj.email,
            verification_code,
            user_obj.full_name
        )
    except Exception as e:
        logging.error(f"Failed to send verification email: {e}")
    
    # Create access token
    access_token = create_access_token(data={"user_id": user_obj.id, "email": user_obj.email})
    
    return Token(access_token=access_token, user=user_obj)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Convert datetime strings back to datetime for User model
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user_obj = User(**{k: v for k, v in user.items() if k not in ['_id', 'password']})
    access_token = create_access_token(data={"user_id": user_obj.id, "email": user_obj.email})
    
    return Token(access_token=access_token, user=user_obj)

@api_router.post("/auth/verify-email")
async def verify_email(verification: EmailVerificationCode):
    """Verify email with 6-digit code"""
    user = await users_collection.find_one({"email": verification.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already verified
    if user.get('email_verified', False):
        return {"message": "Email already verified", "verified": True}
    
    # Check if code matches
    if user.get('email_verification_code') != verification.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Check if code expired
    code_expires_at = user.get('code_expires_at')
    if code_expires_at:
        if isinstance(code_expires_at, str):
            code_expires_at = datetime.fromisoformat(code_expires_at)
        if datetime.utcnow() > code_expires_at:
            raise HTTPException(status_code=400, detail="Verification code expired. Please request a new code")
    
    # Mark email as verified
    await users_collection.update_one(
        {"email": verification.email},
        {"$set": {
            "email_verified": True,
            "is_verified": True,
            "email_verification_code": None,
            "code_expires_at": None
        }}
    )
    
    return {"message": "Email verified successfully", "verified": True}

@api_router.post("/auth/resend-verification-code")
async def resend_verification_code(request: EmailVerificationRequest):
    """Resend verification code (max 3 times per hour)"""
    user = await users_collection.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already verified
    if user.get('email_verified', False):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Check resend limit
    last_sent = user.get('last_code_sent_at')
    resend_count = user.get('code_resend_count', 0)
    
    if last_sent:
        if isinstance(last_sent, str):
            last_sent = datetime.fromisoformat(last_sent)
        
        # Reset count if more than 1 hour has passed
        if (datetime.utcnow() - last_sent).total_seconds() > 3600:
            resend_count = 0
        elif resend_count >= 3:
            raise HTTPException(status_code=429, detail="Too many resend attempts. Please try again in an hour")
    
    # Generate new code
    verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    code_expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Update user with new code
    await users_collection.update_one(
        {"email": request.email},
        {"$set": {
            "email_verification_code": verification_code,
            "code_expires_at": code_expires_at.isoformat(),
            "last_code_sent_at": datetime.utcnow().isoformat(),
            "code_resend_count": resend_count + 1
        }}
    )
    
    # Send email
    try:
        await email_service.send_verification_code(
            request.email,
            verification_code,
            user.get('full_name', 'User')
        )
    except Exception as e:
        logging.error(f"Failed to send verification email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")
    
    return {"message": "Verification code sent", "resends_remaining": 3 - (resend_count + 1)}

@api_router.get("/auth/profile-status")
async def get_profile_status(user_id: str = Depends(get_current_user_id)):
    """Get profile completion status"""
    user = await users_collection.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate completion percentage
    required_fields = {
        "profile_photo": user.get("profile_photo"),
        "full_name": user.get("full_name"),
        "phone": user.get("phone"),
        "location": user.get("location")
    }
    
    completed_fields = sum(1 for v in required_fields.values() if v)
    total_required = len(required_fields)
    
    # Additional requirements for providers
    if user.get("user_type") == "provider":
        profile = await provider_profiles_collection.find_one({"user_id": user_id}, {"_id": 0})
        if profile:
            # Check service categories
            has_categories = profile.get("service_categories") and len(profile.get("service_categories", [])) > 0
            # Check portfolio (min 3 photos)
            portfolio_count = len(profile.get("portfolio_images", []))
            has_portfolio = portfolio_count >= 3
            # Check experience level
            has_experience = profile.get("years_experience") is not None
            
            if has_categories:
                completed_fields += 1
            if has_portfolio:
                completed_fields += 1
            if has_experience:
                completed_fields += 1
            
            total_required += 3  # 3 additional required fields for providers
            
            required_fields.update({
                "service_categories": has_categories,
                "portfolio": has_portfolio,
                "experience_level": has_experience
            })
    
    completion_percentage = int((completed_fields / total_required) * 100) if total_required > 0 else 0
    is_complete = completion_percentage == 100
    
    # Update profile_completed field if status changed
    if user.get("profile_completed") != is_complete:
        await users_collection.update_one(
            {"id": user_id},
            {"$set": {"profile_completed": is_complete}}
        )
    
    return {
        "profile_completed": is_complete,
        "completion_percentage": completion_percentage,
        "user_type": user.get("user_type"),
        "required_fields": required_fields,
        "missing_fields": [k for k, v in required_fields.items() if not v]
    }

@api_router.post("/auth/complete-profile")
async def mark_profile_complete(user_id: str = Depends(get_current_user_id)):
    """Mark profile as complete after validation"""
    # Get updated status
    status = await get_profile_status(user_id)
    
    if not status["profile_completed"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Profile incomplete. Missing: {', '.join(status['missing_fields'])}"
        )
    
    return {"message": "Profile completed successfully", "status": status}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_profile(user_id: str = Depends(get_current_user_id)):
    user = await users_collection.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

@api_router.put("/auth/profile", response_model=User)
async def update_profile(update_data: UserUpdate, user_id: str = Depends(get_current_user_id)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await users_collection.update_one(
            {"id": user_id},
            {"$set": update_dict}
        )
    
    user = await users_collection.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

# ============ CATEGORIES ============

@api_router.get("/categories")
async def list_categories():
    return get_categories()

# ============ PROVIDER PROFILE ENDPOINTS ============

@api_router.get("/provider/profile", response_model=ProviderProfile)
async def get_provider_profile(user_id: str = Depends(get_current_user_id)):
    profile = await provider_profiles_collection.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    
    if isinstance(profile.get('created_at'), str):
        profile['created_at'] = datetime.fromisoformat(profile['created_at'])
    
    return ProviderProfile(**profile)

@api_router.put("/provider/profile", response_model=ProviderProfile)
async def update_provider_profile(update_data: ProviderProfileUpdate, user_id: str = Depends(get_current_user_id)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await provider_profiles_collection.update_one(
            {"user_id": user_id},
            {"$set": update_dict}
        )
    
    profile = await provider_profiles_collection.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(profile.get('created_at'), str):
        profile['created_at'] = datetime.fromisoformat(profile['created_at'])
    
    return ProviderProfile(**profile)

# ============ SERVICE ENDPOINTS ============

@api_router.post("/services", response_model=Service)
async def create_service(service_data: ServiceCreate, user_id: str = Depends(get_current_user_id)):
    service_obj = Service(**service_data.model_dump(), provider_id=user_id)
    
    doc = service_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await services_collection.insert_one(doc)
    return service_obj

@api_router.get("/services")
async def list_all_services(
    category: Optional[str] = None, 
    provider_id: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_distance: Optional[float] = None,  # in kilometers
    sort_by: Optional[str] = "distance"  # distance, price, rating
):
    """
    List services with optional location-based filtering
    If latitude/longitude provided, returns services with distance calculated
    max_distance filters services within specified km radius
    """
    query = {}
    if category:
        query['category'] = category
    if provider_id:
        query['provider_id'] = provider_id
    
    services = await services_collection.find(query, {"_id": 0}).to_list(1000)
    
    # Process services
    for service in services:
        if isinstance(service.get('created_at'), str):
            service['created_at'] = datetime.fromisoformat(service['created_at'])
        if isinstance(service.get('updated_at'), str):
            service['updated_at'] = datetime.fromisoformat(service['updated_at'])
        
        # Calculate distance if user location provided
        if latitude is not None and longitude is not None:
            # Get provider location (fallback to service location if available)
            provider = await users_collection.find_one({"id": service['provider_id']}, {"_id": 0})
            if provider:
                provider_lat = provider.get('latitude') or service.get('latitude')
                provider_lon = provider.get('longitude') or service.get('longitude')
                
                if provider_lat and provider_lon:
                    distance = calculate_distance(latitude, longitude, provider_lat, provider_lon)
                    service['distance_km'] = distance
                else:
                    service['distance_km'] = None
            else:
                service['distance_km'] = None
        else:
            service['distance_km'] = None
    
    # Filter by max distance if specified
    if max_distance is not None and latitude is not None:
        services = [s for s in services if s.get('distance_km') is not None and s['distance_km'] <= max_distance]
    
    # Sort services
    if sort_by == "distance" and latitude is not None:
        # Sort by distance (closest first), put None distances at end
        services.sort(key=lambda x: (x['distance_km'] is None, x['distance_km'] if x['distance_km'] is not None else float('inf')))
    elif sort_by == "price":
        services.sort(key=lambda x: x['price'])
    
    return services

@api_router.get("/services/{service_id}", response_model=Service)
async def get_service(service_id: str):
    service = await services_collection.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if isinstance(service.get('created_at'), str):
        service['created_at'] = datetime.fromisoformat(service['created_at'])
    if isinstance(service.get('updated_at'), str):
        service['updated_at'] = datetime.fromisoformat(service['updated_at'])
    
    return Service(**service)

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, update_data: ServiceUpdate, user_id: str = Depends(get_current_user_id)):
    service = await services_collection.find_one({"id": service_id, "provider_id": user_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found or unauthorized")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.utcnow().isoformat()
    
    await services_collection.update_one(
        {"id": service_id},
        {"$set": update_dict}
    )
    
    service = await services_collection.find_one({"id": service_id}, {"_id": 0})
    if isinstance(service.get('created_at'), str):
        service['created_at'] = datetime.fromisoformat(service['created_at'])
    if isinstance(service.get('updated_at'), str):
        service['updated_at'] = datetime.fromisoformat(service['updated_at'])
    
    return Service(**service)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, user_id: str = Depends(get_current_user_id)):
    result = await services_collection.delete_one({"id": service_id, "provider_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found or unauthorized")
    return {"message": "Service deleted successfully"}

# ============ PROVIDERS BROWSE ENDPOINT ============

@api_router.get("/providers")
async def list_providers(
    category: Optional[str] = None, 
    latitude: Optional[float] = None, 
    longitude: Optional[float] = None,
    max_distance: Optional[float] = None  # in kilometers
):
    """List providers with optional location filtering and distance calculation"""
    # Get all provider users
    query = {"user_type": "provider", "is_active": True}
    providers = await users_collection.find(query, {"_id": 0, "password": 0}).to_list(1000)
    
    result = []
    for provider in providers:
        # Get provider profile
        profile = await provider_profiles_collection.find_one({"user_id": provider['id']}, {"_id": 0})
        if not profile:
            continue
            
        # Filter by category if provided
        if category and category not in profile.get('service_categories', []):
            continue
        
        # Calculate distance if location provided
        distance_km = None
        if latitude is not None and longitude is not None:
            provider_lat = provider.get('latitude')
            provider_lon = provider.get('longitude')
            if provider_lat and provider_lon:
                distance_km = calculate_distance(latitude, longitude, provider_lat, provider_lon)
        
        # Filter by max distance
        if max_distance is not None and distance_km is not None:
            if distance_km > max_distance:
                continue
        
        # Get provider services
        services = await services_collection.find({"provider_id": provider['id']}, {"_id": 0}).to_list(100)
        
        if isinstance(provider.get('created_at'), str):
            provider['created_at'] = datetime.fromisoformat(provider['created_at'])
        
        provider_data = {
            "user": User(**provider),
            "profile": profile,
            "services_count": len(services),
            "distance_km": distance_km
        }
        
        result.append(provider_data)
    
    # Sort by distance if location provided
    if latitude is not None and longitude is not None:
        result.sort(key=lambda x: (x['distance_km'] is None, x['distance_km'] if x['distance_km'] is not None else float('inf')))
    
    return result

@api_router.get("/providers/{provider_id}")
async def get_provider_detail(provider_id: str):
    user = await users_collection.find_one({"id": provider_id, "user_type": "provider"}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    profile = await provider_profiles_collection.find_one({"user_id": provider_id}, {"_id": 0})
    services = await services_collection.find({"provider_id": provider_id}, {"_id": 0}).to_list(100)
    reviews = await reviews_collection.find({"provider_id": provider_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    for service in services:
        if isinstance(service.get('created_at'), str):
            service['created_at'] = datetime.fromisoformat(service['created_at'])
        if isinstance(service.get('updated_at'), str):
            service['updated_at'] = datetime.fromisoformat(service['updated_at'])
    
    for review in reviews:
        if isinstance(review.get('created_at'), str):
            review['created_at'] = datetime.fromisoformat(review['created_at'])
    
    return {
        "user": User(**user),
        "profile": profile,
        "services": [Service(**s) for s in services],
        "reviews": [Review(**r) for r in reviews]
    }

# ============ BOOKING ENDPOINTS ============

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, user_id: str = Depends(get_current_user_id)):
    # Get service to calculate total amount
    service = await services_collection.find_one({"id": booking_data.service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    booking_obj = Booking(**booking_data.model_dump(), customer_id=user_id, total_amount=service['price'])
    
    doc = booking_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await bookings_collection.insert_one(doc)
    
    # Create notification
    notification = {
        "user_id": booking_data.provider_id,
        "type": "new_booking",
        "message": "You have a new booking request",
        "booking_id": booking_obj.id,
        "is_read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    await notifications_collection.insert_one(notification)
    
    return booking_obj

@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(user_id: str = Depends(get_current_user_id)):
    # Get user to determine if provider or customer
    user = await users_collection.find_one({"id": user_id})
    
    if user['user_type'] == "provider":
        bookings = await bookings_collection.find({"provider_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    else:
        bookings = await bookings_collection.find({"customer_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for booking in bookings:
        if isinstance(booking.get('created_at'), str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
        if isinstance(booking.get('updated_at'), str):
            booking['updated_at'] = datetime.fromisoformat(booking['updated_at'])
    
    return [Booking(**b) for b in bookings]

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, user_id: str = Depends(get_current_user_id)):
    booking = await bookings_collection.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    if booking['customer_id'] != user_id and booking['provider_id'] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if isinstance(booking.get('created_at'), str):
        booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    if isinstance(booking.get('updated_at'), str):
        booking['updated_at'] = datetime.fromisoformat(booking['updated_at'])
    
    return Booking(**booking)

# ============ PRICE NEGOTIATION ENDPOINTS ============

@api_router.post("/bookings/{booking_id}/offer-price", response_model=PriceOffer)
async def create_price_offer(booking_id: str, offer_data: PriceOfferCreate, user_id: str = Depends(get_current_user_id)):
    """Create a price offer for a booking"""
    booking = await bookings_collection.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization (customer or provider can offer)
    if booking['customer_id'] != user_id and booking['provider_id'] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Determine sender and receiver
    is_customer = booking['customer_id'] == user_id
    sender_id = user_id
    receiver_id = booking['provider_id'] if is_customer else booking['customer_id']
    
    # Create price offer
    price_offer = PriceOffer(
        booking_id=booking_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        offer_amount=offer_data.offer_amount,
        offer_type="initial",
        message=offer_data.message
    )
    
    doc = price_offer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await price_offers_collection.insert_one(doc)
    
    return price_offer

@api_router.get("/bookings/{booking_id}/offers", response_model=List[PriceOffer])
async def get_price_offers(booking_id: str, user_id: str = Depends(get_current_user_id)):
    """Get all price offers for a booking"""
    booking = await bookings_collection.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    if booking['customer_id'] != user_id and booking['provider_id'] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    offers = await price_offers_collection.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Convert datetime strings
    for offer in offers:
        if isinstance(offer.get('created_at'), str):
            offer['created_at'] = datetime.fromisoformat(offer['created_at'])
    
    return [PriceOffer(**o) for o in offers]

@api_router.put("/offers/{offer_id}/respond")
async def respond_to_offer(offer_id: str, response: PriceOfferResponse, user_id: str = Depends(get_current_user_id)):
    """Accept, decline, or counter a price offer"""
    offer = await price_offers_collection.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    # Check authorization (must be receiver)
    if offer['receiver_id'] != user_id:
        raise HTTPException(status_code=403, detail="Only the receiver can respond to this offer")
    
    if response.action == "accept":
        # Mark offer as accepted
        await price_offers_collection.update_one(
            {"id": offer_id},
            {"$set": {"status": "accepted", "offer_type": "accepted"}}
        )
        
        # Update booking with agreed price
        await bookings_collection.update_one(
            {"id": offer['booking_id']},
            {"$set": {
                "agreed_price": offer['offer_amount'],
                "total_amount": offer['offer_amount'],
                "price_negotiated": True
            }}
        )
        
        return {"message": "Offer accepted", "agreed_price": offer['offer_amount']}
    
    elif response.action == "decline":
        # Mark offer as declined
        await price_offers_collection.update_one(
            {"id": offer_id},
            {"$set": {"status": "declined", "offer_type": "declined"}}
        )
        
        return {"message": "Offer declined"}
    
    elif response.action == "counter":
        if not response.counter_amount:
            raise HTTPException(status_code=400, detail="Counter amount required")
        
        # Mark original offer as countered
        await price_offers_collection.update_one(
            {"id": offer_id},
            {"$set": {"status": "countered"}}
        )
        
        # Create counter offer
        counter_offer = PriceOffer(
            booking_id=offer['booking_id'],
            sender_id=user_id,
            receiver_id=offer['sender_id'],
            offer_amount=response.counter_amount,
            offer_type="counter",
            message=response.message
        )
        
        doc = counter_offer.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await price_offers_collection.insert_one(doc)
        
        return {"message": "Counter offer sent", "counter_amount": response.counter_amount}

@api_router.put("/bookings/{booking_id}/status", response_model=Booking)
async def update_booking_status(booking_id: str, status_update: BookingStatusUpdate, user_id: str = Depends(get_current_user_id)):
    booking = await bookings_collection.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    user = await users_collection.find_one({"id": user_id})
    
    # Provider can mark as accepted or completed
    # Customer can mark as customer_confirmed
    if status_update.status in ["accepted", "completed"] and booking['provider_id'] != user_id:
        raise HTTPException(status_code=403, detail="Only provider can accept or complete booking")
    
    if status_update.status == "customer_confirmed" and booking['customer_id'] != user_id:
        raise HTTPException(status_code=403, detail="Only customer can confirm completion")
    
    # Validate status transitions
    if status_update.status == "customer_confirmed" and booking['status'] != "completed":
        raise HTTPException(status_code=400, detail="Booking must be completed by provider first")
    
    update_dict = {
        "status": status_update.status,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    await bookings_collection.update_one(
        {"id": booking_id},
        {"$set": update_dict}
    )
    
    # Update provider total bookings if accepted
    if status_update.status == "accepted":
        await provider_profiles_collection.update_one(
            {"user_id": booking['provider_id']},
            {"$inc": {"total_bookings": 1}}
        )
    
    booking = await bookings_collection.find_one({"id": booking_id}, {"_id": 0})
    if isinstance(booking.get('created_at'), str):
        booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    if isinstance(booking.get('updated_at'), str):
        booking['updated_at'] = datetime.fromisoformat(booking['updated_at'])
    
    return Booking(**booking)

# ============ MESSAGES / CHAT ENDPOINTS ============

@api_router.get("/messages/{booking_id}", response_model=List[Message])
async def get_messages(booking_id: str, user_id: str = Depends(get_current_user_id)):
    # Verify user is part of booking
    booking = await bookings_collection.find_one({"id": booking_id})
    if not booking or (booking['customer_id'] != user_id and booking['provider_id'] != user_id):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    messages = await messages_collection.find({"booking_id": booking_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return [Message(**m) for m in messages]

@api_router.websocket("/ws/chat/{booking_id}")
async def websocket_chat(websocket: WebSocket, booking_id: str):
    await manager.connect(websocket, booking_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Get sender info
            user = await users_collection.find_one({"id": data['sender_id']}, {"_id": 0})
            
            # Create message
            message_obj = Message(
                booking_id=booking_id,
                sender_id=data['sender_id'],
                sender_name=user['full_name'],
                text=data['text']
            )
            
            # Save to database
            doc = message_obj.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await messages_collection.insert_one(doc)
            
            # Broadcast to all connected clients in this booking
            await manager.send_message(message_obj.model_dump(), booking_id)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, booking_id)

# ============ REVIEW ENDPOINTS ============

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, user_id: str = Depends(get_current_user_id)):
    # Check if booking exists and is completed
    booking = await bookings_collection.find_one({"id": review_data.booking_id, "customer_id": user_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or unauthorized")
    
    if booking['status'] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    # Check if already reviewed
    existing = await reviews_collection.find_one({"booking_id": review_data.booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Booking already reviewed")
    
    user = await users_collection.find_one({"id": user_id})
    review_obj = Review(**review_data.model_dump(), customer_id=user_id, customer_name=user['full_name'])
    
    doc = review_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await reviews_collection.insert_one(doc)
    
    # Update provider rating
    reviews = await reviews_collection.find({"provider_id": review_data.provider_id}).to_list(1000)
    avg_rating = sum(r['rating'] for r in reviews) / len(reviews)
    
    await provider_profiles_collection.update_one(
        {"user_id": review_data.provider_id},
        {"$set": {"average_rating": avg_rating, "total_reviews": len(reviews)}}
    )
    
    return review_obj

@api_router.get("/reviews/provider/{provider_id}", response_model=List[Review])
async def get_provider_reviews(provider_id: str):
    reviews = await reviews_collection.find({"provider_id": provider_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for review in reviews:
        if isinstance(review.get('created_at'), str):
            review['created_at'] = datetime.fromisoformat(review['created_at'])
    
    return [Review(**r) for r in reviews]

# ============ NOTIFICATIONS ============

@api_router.get("/notifications")
async def get_notifications(user_id: str = Depends(get_current_user_id)):
    notifications = await notifications_collection.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_id: str = Depends(get_current_user_id)):
    await notifications_collection.update_one(
        {"id": notification_id, "user_id": user_id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notification marked as read"}

# ============ AI SERVICE DESCRIPTION GENERATOR ============

@api_router.post("/ai/generate-description", response_model=ServiceDescriptionResponse)
async def generate_service_description(request: ServiceDescriptionRequest):
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"service-desc-{datetime.utcnow().timestamp()}",
            system_message="You are a professional service description writer. Create compelling, professional service descriptions that highlight key benefits and attract customers. Keep it concise (2-3 sentences, max 150 words)."
        ).with_model("openai", "gpt-4o-mini")
        
        prompt = f"Create a professional service description for: {request.title} in category {request.category}."
        if request.additional_info:
            prompt += f" Additional info: {request.additional_info}"
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return ServiceDescriptionResponse(description=response)
    except Exception as e:
        logging.error(f"AI description generation failed: {e}")
        return ServiceDescriptionResponse(
            description=f"Professional {request.category} service - {request.title}. Contact us for more details."
        )

# ============ PAYMENT ENDPOINTS (Paystack) ============

@api_router.post("/payments/initialize")
async def initialize_payment(booking_id: str, user_id: str = Depends(get_current_user_id)):
    booking = await bookings_collection.find_one({"id": booking_id, "customer_id": user_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Only allow payment for customer_confirmed bookings
    if booking['status'] != "customer_confirmed":
        raise HTTPException(status_code=400, detail="Booking must be confirmed by customer before payment")
    
    # Check if already paid
    if booking['payment_status'] == "paid":
        raise HTTPException(status_code=400, detail="Booking is already paid")
    
    # Get user details for payment
    user = await users_collection.find_one({"id": user_id})
    
    # Initialize Paystack payment
    paystack_secret = os.environ.get('PAYSTACK_SECRET_KEY')
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.paystack.co/transaction/initialize",
                headers={
                    "Authorization": f"Bearer {paystack_secret}",
                    "Content-Type": "application/json"
                },
                json={
                    "email": user['email'],
                    "amount": int(booking['total_amount'] * 100),  # Paystack uses kobo (cents)
                    "reference": f"ref_{booking_id}",
                    "callback_url": f"{os.environ.get('CORS_ORIGINS', 'http://localhost:3000')}/payment/callback",
                    "metadata": {
                        "booking_id": booking_id,
                        "customer_name": user['full_name']
                    }
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data['status']:
                    return {
                        "authorization_url": data['data']['authorization_url'],
                        "reference": data['data']['reference'],
                        "access_code": data['data']['access_code']
                    }
            
            raise HTTPException(status_code=400, detail="Payment initialization failed")
            
    except Exception as e:
        logging.error(f"Paystack initialization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/verify/{reference}")
async def verify_payment(reference: str, user_id: str = Depends(get_current_user_id)):
    paystack_secret = os.environ.get('PAYSTACK_SECRET_KEY')
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers={
                    "Authorization": f"Bearer {paystack_secret}"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] and data['data']['status'] == 'success':
                    # Extract booking_id from reference
                    booking_id = reference.replace("ref_", "")
                    
                    # Get booking details
                    booking = await bookings_collection.find_one({"id": booking_id})
                    if not booking:
                        raise HTTPException(status_code=404, detail="Booking not found")
                    
                    # Calculate fees (10% platform fee, 90% provider earnings)
                    total_amount = booking['total_amount']
                    platform_fee = total_amount * 0.10
                    provider_earnings = total_amount - platform_fee
                    
                    # Update booking payment status
                    await bookings_collection.update_one(
                        {"id": booking_id},
                        {"$set": {"payment_status": "paid"}}
                    )
                    
                    # Create transaction record with escrow status
                    transaction = Transaction(
                        booking_id=booking_id,
                        customer_id=booking['customer_id'],
                        provider_id=booking['provider_id'],
                        amount=total_amount,
                        platform_fee=platform_fee,
                        provider_earnings=provider_earnings,
                        payment_reference=reference,
                        payment_status="success",
                        escrow_status="released"  # Money is split immediately
                    )
                    
                    doc = transaction.model_dump()
                    doc['created_at'] = doc['created_at'].isoformat()
                    await transactions_collection.insert_one(doc)
                    
                    # Update provider wallet balance
                    await provider_profiles_collection.update_one(
                        {"user_id": booking['provider_id']},
                        {
                            "$inc": {
                                "balance": provider_earnings,
                                "total_earned": provider_earnings
                            }
                        }
                    )
                    
                    return {"status": "success", "message": "Payment verified and funds distributed", "data": data['data']}
                else:
                    return {"status": "failed", "message": "Payment verification failed"}
            
            raise HTTPException(status_code=400, detail="Verification failed")
            
    except Exception as e:
        logging.error(f"Paystack verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/transactions")
async def get_transactions(user_id: str = Depends(get_current_user_id)):
    user = await users_collection.find_one({"id": user_id})
    
    if user['user_type'] == "provider":
        transactions = await transactions_collection.find(
            {"provider_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    else:
        transactions = await transactions_collection.find(
            {"customer_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    
    return transactions

# ============ WITHDRAWAL ENDPOINTS ============

@api_router.post("/withdrawals/request", response_model=Withdrawal)
async def request_withdrawal(withdrawal_req: WithdrawalRequest, user_id: str = Depends(get_current_user_id)):
    """Provider requests withdrawal of their wallet balance"""
    # Check if user is a provider
    user = await users_collection.find_one({"id": user_id})
    if not user or user['user_type'] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can request withdrawals")
    
    # Get provider profile
    profile = await provider_profiles_collection.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    
    # Check balance
    if profile['balance'] < withdrawal_req.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: ₦{profile['balance']}")
    
    # Check minimum withdrawal amount
    if withdrawal_req.amount < 5000:
        raise HTTPException(status_code=400, detail="Minimum withdrawal amount is ₦5,000")
    
    # Validate bank details
    if not profile.get('bank_account_number') or not profile.get('bank_code') or not profile.get('account_name'):
        raise HTTPException(status_code=400, detail="Please update your bank details in your profile first")
    
    # Create withdrawal request
    withdrawal = Withdrawal(
        provider_id=user_id,
        amount=withdrawal_req.amount,
        bank_account_number=profile['bank_account_number'],
        bank_code=profile['bank_code'],
        account_name=profile['account_name'],
        status="pending"
    )
    
    # Deduct from balance (hold in escrow until admin approves)
    await provider_profiles_collection.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": -withdrawal_req.amount}}
    )
    
    # Save withdrawal request
    doc = withdrawal.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await withdrawals_collection.insert_one(doc)
    
    return withdrawal

@api_router.get("/withdrawals", response_model=List[Withdrawal])
async def get_withdrawals(user_id: str = Depends(get_current_user_id)):
    """Get withdrawal history for provider"""
    user = await users_collection.find_one({"id": user_id})
    if not user or user['user_type'] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can view withdrawals")
    
    withdrawals = await withdrawals_collection.find(
        {"provider_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Convert datetime strings back to datetime objects
    for w in withdrawals:
        if isinstance(w.get('created_at'), str):
            w['created_at'] = datetime.fromisoformat(w['created_at'])
        if w.get('completed_at') and isinstance(w['completed_at'], str):
            w['completed_at'] = datetime.fromisoformat(w['completed_at'])
    
    return [Withdrawal(**w) for w in withdrawals]

@api_router.get("/provider/wallet")
async def get_provider_wallet(user_id: str = Depends(get_current_user_id)):
    """Get provider wallet balance and summary"""
    user = await users_collection.find_one({"id": user_id})
    if not user or user['user_type'] != "provider":
        raise HTTPException(status_code=403, detail="Only providers can view wallet")
    
    profile = await provider_profiles_collection.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    
    # Get pending withdrawals
    pending_withdrawals = await withdrawals_collection.count_documents({
        "provider_id": user_id,
        "status": "pending"
    })
    
    return {
        "balance": profile.get('balance', 0.0),
        "total_earned": profile.get('total_earned', 0.0),
        "pending_withdrawals": pending_withdrawals,
        "bank_account_number": profile.get('bank_account_number'),
        "bank_code": profile.get('bank_code'),
        "account_name": profile.get('account_name')
    }

# ============ IMAGE UPLOAD ENDPOINTS ============

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    """Upload an image and return base64 data URL"""
    try:
        # Read file content
        contents = await file.read()
        
        # Check file size (max 5MB)
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max size is 5MB")
        
        # Check file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Convert to base64
        base64_image = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_image}"
        
        return {
            "url": data_url,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(contents)
        }
    except Exception as e:
        logging.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail="Image upload failed")

# ============ ADMIN ENDPOINTS ============

@api_router.get("/admin/stats")
async def get_admin_stats(admin_user: dict = Depends(get_admin_user)):
    """Get dashboard statistics for admin"""
    try:
        # Count users
        total_users = await users_collection.count_documents({})
        customers = await users_collection.count_documents({"user_type": "customer"})
        providers = await users_collection.count_documents({"user_type": "provider"})
        
        # Count bookings
        total_bookings = await bookings_collection.count_documents({})
        active_bookings = await bookings_collection.count_documents({
            "status": {"$in": ["pending", "accepted", "completed", "customer_confirmed"]},
            "payment_status": "pending"
        })
        completed_bookings = await bookings_collection.count_documents({"payment_status": "paid"})
        
        # Calculate revenue
        transactions = await transactions_collection.find({"payment_status": "success"}, {"_id": 0}).to_list(1000)
        total_revenue = sum(t.get('amount', 0) for t in transactions)
        platform_earnings = sum(t.get('platform_fee', 0) for t in transactions)
        
        # Get this month's data
        from datetime import timezone
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        month_bookings = await bookings_collection.count_documents({
            "created_at": {"$gte": month_start.isoformat()}
        })
        
        month_transactions = [t for t in transactions if datetime.fromisoformat(t['created_at']) >= month_start]
        month_revenue = sum(t.get('amount', 0) for t in month_transactions)
        month_earnings = sum(t.get('platform_fee', 0) for t in month_transactions)
        
        # Withdrawal stats
        pending_withdrawals_count = await withdrawals_collection.count_documents({"status": "pending"})
        pending_withdrawals_list = await withdrawals_collection.find({"status": "pending"}, {"_id": 0}).to_list(100)
        pending_withdrawals_amount = sum(w.get('amount', 0) for w in pending_withdrawals_list)
        
        # Average rating
        profiles = await provider_profiles_collection.find({}, {"_id": 0, "average_rating": 1}).to_list(1000)
        avg_rating = sum(p.get('average_rating', 0) for p in profiles) / len(profiles) if profiles else 0
        
        return {
            "users": {
                "total": total_users,
                "customers": customers,
                "providers": providers,
                "new_this_week": 0  # Can implement later with timestamp tracking
            },
            "bookings": {
                "total": total_bookings,
                "active": active_bookings,
                "completed": completed_bookings,
                "completed_this_month": month_bookings
            },
            "revenue": {
                "total": total_revenue,
                "platform_earnings": platform_earnings,
                "month_revenue": month_revenue,
                "month_earnings": month_earnings
            },
            "withdrawals": {
                "pending_count": pending_withdrawals_count,
                "pending_amount": pending_withdrawals_amount
            },
            "ratings": {
                "average": round(avg_rating, 1)
            }
        }
    except Exception as e:
        logging.error(f"Admin stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/withdrawals")
async def get_all_withdrawals(status: Optional[str] = None, admin_user: dict = Depends(get_admin_user)):
    """Get all withdrawal requests with optional status filter"""
    try:
        query = {}
        if status:
            query["status"] = status
        
        withdrawals = await withdrawals_collection.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        
        # Enrich with provider info
        for withdrawal in withdrawals:
            provider = await users_collection.find_one({"id": withdrawal['provider_id']}, {"_id": 0})
            if provider:
                withdrawal['provider_name'] = provider['full_name']
                withdrawal['provider_email'] = provider['email']
                withdrawal['provider_phone'] = provider.get('phone', 'N/A')
            
            # Convert datetime strings
            if isinstance(withdrawal.get('created_at'), str):
                withdrawal['created_at'] = datetime.fromisoformat(withdrawal['created_at'])
            if withdrawal.get('completed_at') and isinstance(withdrawal['completed_at'], str):
                withdrawal['completed_at'] = datetime.fromisoformat(withdrawal['completed_at'])
        
        return withdrawals
    except Exception as e:
        logging.error(f"Get withdrawals error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/withdrawals/{withdrawal_id}")
async def update_withdrawal_status(
    withdrawal_id: str,
    action_data: WithdrawalAction,
    admin_user: dict = Depends(get_admin_user)
):
    """Approve or reject a withdrawal request"""
    try:
        withdrawal = await withdrawals_collection.find_one({"id": withdrawal_id})
        if not withdrawal:
            raise HTTPException(status_code=404, detail="Withdrawal not found")
        
        if withdrawal['status'] != 'pending':
            raise HTTPException(status_code=400, detail="Can only update pending withdrawals")
        
        if action_data.action == "approve":
            # Update withdrawal status
            update_data = {
                "status": "approved",
                "admin_notes": action_data.admin_notes or "Approved by admin",
                "completed_at": datetime.utcnow().isoformat()
            }
            
            if action_data.transaction_reference:
                update_data["transfer_reference"] = action_data.transaction_reference
            
            await withdrawals_collection.update_one(
                {"id": withdrawal_id},
                {"$set": update_data}
            )
            
            return {"message": "Withdrawal approved successfully", "withdrawal_id": withdrawal_id}
        
        elif action_data.action == "reject":
            # Return amount to provider balance
            await provider_profiles_collection.update_one(
                {"user_id": withdrawal['provider_id']},
                {"$inc": {"balance": withdrawal['amount']}}
            )
            
            # Update withdrawal status
            await withdrawals_collection.update_one(
                {"id": withdrawal_id},
                {"$set": {
                    "status": "failed",
                    "admin_notes": action_data.admin_notes or "Rejected by admin",
                    "completed_at": datetime.utcnow().isoformat()
                }}
            )
            
            return {"message": "Withdrawal rejected and amount returned to provider", "withdrawal_id": withdrawal_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update withdrawal error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/users")
async def get_all_users(user_type: Optional[str] = None, admin_user: dict = Depends(get_admin_user)):
    """Get all users with optional type filter"""
    try:
        query = {}
        if user_type and user_type != "all":
            query["user_type"] = user_type
        
        users = await users_collection.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(1000)
        
        # Convert datetime strings
        for user in users:
            if isinstance(user.get('created_at'), str):
                user['created_at'] = datetime.fromisoformat(user['created_at'])
        
        return users
    except Exception as e:
        logging.error(f"Get users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/users/{user_id}/verify")
async def admin_verify_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Admin manually verify a user's email"""
    try:
        user = await users_collection.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await users_collection.update_one(
            {"id": user_id},
            {"$set": {"email_verified": True}}
        )
        
        return {"message": "User verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Admin verify user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/users/{user_id}/toggle-active")
async def admin_toggle_user_active(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Admin activate or suspend a user account"""
    try:
        user = await users_collection.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Toggle active status
        new_status = not user.get("is_active", True)
        
        await users_collection.update_one(
            {"id": user_id},
            {"$set": {"is_active": new_status}}
        )
        
        status_text = "activated" if new_status else "suspended"
        return {"message": f"User {status_text} successfully", "is_active": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Admin toggle user active error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/users/{user_id}")
async def admin_get_user_details(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Get detailed user information"""
    try:
        user = await users_collection.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert datetime strings
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        
        # Get user statistics
        if user["user_type"] == "provider":
            # Get provider stats
            services_count = await services_collection.count_documents({"provider_id": user_id})
            bookings_count = await bookings_collection.count_documents({"provider_id": user_id})
            reviews = await reviews_collection.find({"provider_id": user_id}).to_list(1000)
            avg_rating = sum([r["rating"] for r in reviews]) / len(reviews) if reviews else 0
            
            user["stats"] = {
                "services_count": services_count,
                "bookings_count": bookings_count,
                "reviews_count": len(reviews),
                "avg_rating": round(avg_rating, 1),
                "wallet_balance": user.get("balance", 0),
                "total_earned": user.get("total_earned", 0)
            }
        else:
            # Get customer stats
            bookings_count = await bookings_collection.count_documents({"customer_id": user_id})
            user["stats"] = {
                "bookings_count": bookings_count
            }
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Admin get user details error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/activity")
async def get_recent_activity(limit: int = 20, admin_user: dict = Depends(get_admin_user)):
    """Get recent platform activity"""
    try:
        activities = []
        
        # Recent bookings
        recent_bookings = await bookings_collection.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for booking in recent_bookings:
            customer = await users_collection.find_one({"id": booking['customer_id']}, {"_id": 0, "full_name": 1})
            provider = await users_collection.find_one({"id": booking['provider_id']}, {"_id": 0, "full_name": 1})
            activities.append({
                "type": "booking",
                "message": f"New booking from {customer['full_name'] if customer else 'Unknown'} to {provider['full_name'] if provider else 'Unknown'}",
                "timestamp": booking['created_at'],
                "status": booking['status']
            })
        
        # Recent withdrawals
        recent_withdrawals = await withdrawals_collection.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for withdrawal in recent_withdrawals:
            provider = await users_collection.find_one({"id": withdrawal['provider_id']}, {"_id": 0, "full_name": 1})
            activities.append({
                "type": "withdrawal",
                "message": f"Withdrawal request: ₦{withdrawal['amount']:,.0f} from {provider['full_name'] if provider else 'Unknown'}",
                "timestamp": withdrawal['created_at'],
                "status": withdrawal['status']
            })
        
        # Sort by timestamp
        activities.sort(key=lambda x: x['timestamp'] if isinstance(x['timestamp'], datetime) else datetime.fromisoformat(x['timestamp']), reverse=True)
        
        return activities[:limit]
    except Exception as e:
        logging.error(f"Get activity error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    from database import client
    client.close()