import os
import json
import bcrypt
from datetime import datetime

# Windows fix for bcrypt
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type('obj', (object,), {'__version__': bcrypt.__version__})

import google.generativeai as genai
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from database import user_collection, database # Ensure database.py exports 'database'
from dotenv import load_dotenv

load_dotenv()

# MongoDB Collections
health_collection = database.get_collection("daily_health_logs")

# Gemini Setup
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Helper: Get Today's Date String ---
def get_today():
    return datetime.now().strftime("%Y-%m-%d")

def clean_ai_json(text):
    text = text.strip()
    if text.startswith("```json"): text = text[7:]
    if text.endswith("```"): text = text[:-3]
    return text.strip()

# --- Auth --- (Keep as is)
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

@app.post("/signup")
async def signup(user: UserSignup):
    existing_user = await user_collection.find_one({"email": user.email})
    if existing_user: raise HTTPException(status_code=400, detail="Email exists!")
    hashed_pwd = pwd_context.hash(user.password)
    await user_collection.insert_one({"username": user.name, "email": user.email, "password": hashed_pwd})
    return {"status": "success"}

@app.post("/login")
async def login(user: dict = Body(...)):
    db_user = await user_collection.find_one({"email": user['email']})
    if not db_user or not pwd_context.verify(user['password'], db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"status": "success", "username": db_user["username"], "email": db_user["email"]}

# --- Smart Nutrition Analysis & Storage ---
@app.post("/analyze-nutrition")
async def analyze_nutrition(data: dict = Body(...)):
    user_email = data.get('email')
    today = get_today()
    
    try:
        prompt = f"""
        Analyze Indian meals: Breakfast:{data.get('breakfast')}, Lunch:{data.get('lunch')}, Dinner:{data.get('dinner')}.
        Return ONLY JSON:
        {{
          "breakfast": {{"items": [], "calories": 0}},
          "lunch": {{"items": [], "calories": 0}},
          "dinner": {{"items": [], "calories": 0}},
          "tip": "Sassy Indian tip"
        }}
        """
        response = model.generate_content(prompt)
        ai_plan = json.loads(clean_ai_json(response.text))

        # DB Storage: Update if exists, else create (saves storage)
        await health_collection.update_one(
            {"email": user_email, "date": today},
            {"$set": {
                "user_inputs": {
                    "breakfast": data.get('breakfast'),
                    "lunch": data.get('lunch'),
                    "dinner": data.get('dinner')
                },
                "ai_diet_plan": ai_plan,
                "last_updated": datetime.now()
            }},
            upsert=True
        )
        return {"plan": ai_plan}
    except Exception as e:
        return {"error": str(e)}

# --- Smart Workout Insight (Pulling from DB) ---
@app.post("/workout-insight")
async def get_workout_insight(data: dict = Body(...)):
    user_email = data.get('email')
    today = get_today()

    # DB nundi ee roju thinnadi call chesthunnam
    user_data = await health_collection.find_one({"email": user_email, "date": today})
    meals_context = user_data.get("user_inputs", "No meals logged") if user_data else "No meals logged"

    prompt = f"""
    Context: Indian Health Coach.
    User Ate Today: {meals_context}.
    Steps: {data.get('steps', 0)}, HR: {data.get('heartRate', 72)}.
    
    Task: Give 1 workout advice based on what they ate and 1 hydration alert.
    Return ONLY JSON: {{"insight": "", "alert": ""}}
    """
    try:
        response = model.generate_content(prompt)
        ai_resp = json.loads(clean_ai_json(response.text))
        
        # Update workout insight in the same daily record
        await health_collection.update_one(
            {"email": user_email, "date": today},
            {"$set": {"ai_workout_insight": ai_resp}},
            upsert=True
        )
        return {"data": ai_resp}
    except Exception as e:
        return {"data": {"insight": "Keep moving!", "alert": "Drink water!"}}