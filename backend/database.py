from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
users_collection = db.users
services_collection = db.services
bookings_collection = db.bookings
messages_collection = db.messages
reviews_collection = db.reviews
transactions_collection = db.transactions
provider_profiles_collection = db.provider_profiles
notifications_collection = db.notifications
withdrawals_collection = db.withdrawals
price_offers_collection = db.price_offers

async def get_db():
    return db