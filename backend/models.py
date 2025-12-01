from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime
import uuid

# User Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    user_type: Literal["provider", "customer", "admin"]
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_verified: bool = False
    is_active: bool = True
    email_verified: bool = False
    profile_completed: bool = False
    email_verification_code: Optional[str] = None
    code_expires_at: Optional[datetime] = None
    code_resend_count: int = 0
    last_code_sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# Provider Profile Models
class ProviderProfileBase(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    service_categories: List[str] = []
    pricing_type: Literal["hourly", "fixed"] = "hourly"
    hourly_rate: Optional[float] = None
    fixed_price: Optional[float] = None
    years_experience: Optional[int] = None
    is_available: bool = True
    portfolio_images: List[str] = []  # URLs to portfolio images
    balance: float = 0.0  # Provider wallet balance
    total_earned: float = 0.0  # Total earnings to date
    bank_account_number: Optional[str] = None
    bank_code: Optional[str] = None
    account_name: Optional[str] = None

class ProviderProfile(ProviderProfileBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    average_rating: float = 0.0
    total_reviews: int = 0
    total_bookings: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProviderProfileUpdate(BaseModel):
    bio: Optional[str] = None
    service_categories: Optional[List[str]] = None
    pricing_type: Optional[Literal["hourly", "fixed"]] = None
    hourly_rate: Optional[float] = None
    fixed_price: Optional[float] = None
    years_experience: Optional[int] = None
    is_available: Optional[bool] = None
    portfolio_images: Optional[List[str]] = None
    bank_account_number: Optional[str] = None
    bank_code: Optional[str] = None
    account_name: Optional[str] = None

# Service Models
class ServiceBase(BaseModel):
    title: str
    description: str
    category: str
    price: float
    duration: Optional[int] = None  # in minutes
    images: List[str] = []  # URLs to service images
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ServiceCreate(ServiceBase):
    pass

class Service(ServiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[int] = None
    images: Optional[List[str]] = None

# Booking Models
class BookingBase(BaseModel):
    service_id: str
    provider_id: str
    preferred_date: str
    preferred_time: str
    service_location: str
    notes: Optional[str] = None
    estimated_budget: Optional[float] = None

class BookingCreate(BookingBase):
    pass

class Booking(BookingBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    status: Literal["pending", "accepted", "completed", "customer_confirmed", "cancelled"] = "pending"
    payment_status: Literal["pending", "paid", "refunded"] = "pending"
    total_amount: float = 0.0
    agreed_price: Optional[float] = None
    price_negotiated: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BookingStatusUpdate(BaseModel):
    status: Literal["accepted", "completed", "customer_confirmed", "cancelled"]

# Message Models
class MessageBase(BaseModel):
    text: str

class MessageCreate(MessageBase):
    booking_id: str

class Message(MessageBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    sender_id: str
    sender_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Review Models
class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=300)

class ReviewCreate(ReviewBase):
    booking_id: str
    provider_id: str

class Review(ReviewBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    provider_id: str
    customer_id: str
    customer_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Transaction Models
class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    customer_id: str
    provider_id: str
    amount: float
    platform_fee: float
    provider_earnings: float
    payment_reference: str
    payment_status: Literal["pending", "success", "failed", "refunded"] = "pending"
    escrow_status: Literal["held", "released", "refunded"] = "held"  # Track escrow
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Withdrawal Models
class WithdrawalRequest(BaseModel):
    amount: float = Field(..., gt=0)

class Withdrawal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider_id: str
    amount: float
    status: Literal["pending", "processing", "approved", "success", "failed"] = "pending"
    transfer_code: Optional[str] = None
    transfer_reference: Optional[str] = None
    admin_notes: Optional[str] = None
    bank_account_number: str
    bank_code: str
    account_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

# Admin Models
class WithdrawalAction(BaseModel):
    action: Literal["approve", "reject"]
    admin_notes: Optional[str] = None
    transaction_reference: Optional[str] = None

# Email Verification Models
class EmailVerificationRequest(BaseModel):
    email: EmailStr

class EmailVerificationCode(BaseModel):
    email: EmailStr
    code: str

# Price Negotiation Models
class PriceOffer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    sender_id: str
    receiver_id: str
    offer_amount: float
    offer_type: Literal["initial", "counter", "accepted", "declined"] = "initial"
    status: Literal["pending", "accepted", "declined", "countered"] = "pending"
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PriceOfferCreate(BaseModel):
    offer_amount: float
    message: Optional[str] = None

class PriceOfferResponse(BaseModel):
    action: Literal["accept", "decline", "counter"]
    counter_amount: Optional[float] = None
    message: Optional[str] = None

# Category Model
class Category(BaseModel):
    name: str
    icon: Optional[str] = None

# Token Response
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# AI Service Description Request
class ServiceDescriptionRequest(BaseModel):
    title: str
    category: str
    additional_info: Optional[str] = None

class ServiceDescriptionResponse(BaseModel):
    description: str