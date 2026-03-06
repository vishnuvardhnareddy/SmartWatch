import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_DETAILS = os.getenv("MONGODB_URL", "mongodb+srv://vishnu:vishnu@cluster0.dgbomgs.mongodb.net/?appName=Cluster0")

# Connection pooling: keep connections ready for fast queries
client = AsyncIOMotorClient(
    MONGO_DETAILS,
    maxPoolSize=20,          # Max simultaneous connections
    minPoolSize=5,           # Keep 5 connections warm and ready
    serverSelectionTimeoutMS=5000,  # Fail fast if DB unreachable
    connectTimeoutMS=5000,
    retryWrites=True,
)

database = client.nutrivitals_db
user_collection = database.get_collection("users_collection")