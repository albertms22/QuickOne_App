"""
Migration script to add new image fields to existing accounts
Run this once to update old accounts with new fields
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def migrate():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Starting migration...")
    
    # Update users - add profile_photo if missing
    users_result = await db.users.update_many(
        {"profile_photo": {"$exists": False}},
        {"$set": {"profile_photo": None}}
    )
    print(f"Updated {users_result.modified_count} users with profile_photo field")
    
    # Update services - add images field if missing
    services_result = await db.services.update_many(
        {"images": {"$exists": False}},
        {"$set": {"images": []}}
    )
    print(f"Updated {services_result.modified_count} services with images field")
    
    # Update provider profiles - add portfolio_images if missing
    profiles_result = await db.provider_profiles.update_many(
        {"portfolio_images": {"$exists": False}},
        {"$set": {"portfolio_images": []}}
    )
    print(f"Updated {profiles_result.modified_count} provider profiles with portfolio_images field")
    
    print("Migration completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())
