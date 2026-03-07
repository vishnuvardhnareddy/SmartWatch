
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

async def check_db():
    MONGO_DETAILS = os.getenv("MONGODB_URL", "mongodb+srv://vishnu:vishnu@cluster0.dgbomgs.mongodb.net/?appName=Cluster0")
    client = AsyncIOMotorClient(MONGO_DETAILS)
    database = client.nutrivitals_db
    health_collection = database.get_collection("daily_health_logs")
    
    today = datetime.now().strftime("%Y-%m-%d")
    print(f"Checking data for {today}...")
    
    cursor = health_collection.find({"date": today})
    docs = await cursor.to_list(length=100)
    
    if not docs:
        print("No documents found for today.")
    else:
        for doc in docs:
            print(f"Email: {doc.get('email')}")
            print(f"  Health Metrics: {doc.get('health_metrics')}")
            print(f"  Water Intake: {doc.get('water_intake')}")
            print(f"  Quick Meals: {doc.get('quick_meals')}")
            print(f"  User Inputs: {doc.get('user_inputs')}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_db())
