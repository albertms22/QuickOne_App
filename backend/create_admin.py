"""
Script to create an admin user
Usage: python create_admin.py
"""
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_password_hash
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_admin():
    # Connect to database
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    users_collection = db.users
    
    # Check if admin exists
    existing_admin = await users_collection.find_one({"email": "admin@quickone.com"})
    
    if existing_admin:
        print("❌ Admin user already exists!")
        print(f"   Email: admin@quickone.com")
        return
    
    # Create admin user
    admin_data = {
        "id": str(uuid.uuid4()),
        "email": "admin@quickone.com",
        "password": get_password_hash("admin123"),  # Change this password!
        "full_name": "QuickOne Admin",
        "user_type": "admin",
        "phone": "+234 800 000 0000",
        "profile_photo": None,
        "location": "Lagos",
        "latitude": None,
        "longitude": None,
        "is_verified": True,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await users_collection.insert_one(admin_data)
    
    print("✅ Admin user created successfully!")
    print(f"   Email: admin@quickone.com")
    print(f"   Password: admin123")
    print(f"   User ID: {admin_data['id']}")
    print("\n⚠️  IMPORTANT: Change the admin password after first login!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
