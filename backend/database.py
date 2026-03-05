import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

# Local MongoDB connection
MONGO_DETAILS = os.getenv("MONGODB_URL", "mongodb+srv://vishnu:vishnu@cluster0.dgbomgs.mongodb.net/?appName=Cluster0")

client = AsyncIOMotorClient(MONGO_DETAILS)
database = client.nutrivitals_db  # Database name
user_collection = database.get_collection("users_collection") # Collection for users