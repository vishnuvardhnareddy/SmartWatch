from motor.motor_asyncio import AsyncIOMotorClient

# Local MongoDB connection (Mee laptop lo Compass unte idhe vaadandi)
MONGO_DETAILS = "mongodb://localhost:27017"

client = AsyncIOMotorClient(MONGO_DETAILS)
database = client.nutrivitals_db  # Database name
user_collection = database.get_collection("users_collection") # Collection for users