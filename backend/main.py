import os
import json
import bcrypt
from datetime import datetime, timedelta

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
import joblib
import numpy as np

load_dotenv()

# MongoDB Collections
health_collection = database.get_collection("daily_health_logs")

# Load ML Model
try:
    model_path = os.path.join(os.path.dirname(__file__), 'health_model.pkl')
    health_score_model = joblib.load(model_path)
    print("Health Score ML Model loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load health_model.pkl: {e}")
    health_score_model = None

# Gemini Setup
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    db_status = "Unknown"
    try:
        # Ping the database to check connectivity
        await database.command("ping")
        db_status = "Connected"
    except Exception as e:
        db_status = f"Failed: {str(e)}"
    
    return {
        "status": "NutriVitals Backend is Live!",
        "database": db_status,
        "model_loaded": health_score_model is not None
    }

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
    try:
        email_normalized = user.email.lower().strip()
        print(f"Signup Attempt: {email_normalized}")
        
        existing_user = await user_collection.find_one({"email": email_normalized})
        if existing_user: 
            print(f"Signup Failed: {email_normalized} already exists")
            raise HTTPException(status_code=400, detail="Email exists!")
        
        # Use direct bcrypt for hashing (more reliable on Render)
        password_bytes = user.password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_pwd = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        result = await user_collection.insert_one({
            "username": user.name, 
            "email": email_normalized, 
            "password": hashed_pwd,
            "created_at": datetime.now()
        })
        print(f"Signup Successful: Created user {email_normalized} with ID {result.inserted_id}")
        return {"status": "success"}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Signup Error for {user.email}: {str(e)}")
        return {"status": "error", "message": f"Server error: {str(e)}"}

@app.post("/login")
async def login(user: dict = Body(...)):
    try:
        email = user.get('email', '').lower().strip()
        password = user.get('password', '')
        
        print(f"Login Attempt: {email}")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
            
        db_user = await user_collection.find_one({"email": email})
        
        if not db_user:
             print(f"Login Failed: No user found with email '{email}'")
             raise HTTPException(status_code=401, detail="Email not found")
             
        # Verify password using direct bcrypt
        stored_password = db_user.get("password", "")
        password_bytes = password.encode('utf-8')
        stored_password_bytes = stored_password.encode('utf-8')
        
        if not bcrypt.checkpw(password_bytes, stored_password_bytes):
            print(f"Login Failed: Incorrect password for {email}")
            raise HTTPException(status_code=401, detail="Incorrect password")
            
        print(f"Login Successful: {email}")
        return {
            "status": "success", 
            "username": db_user.get("username", db_user.get("name", "User")), 
            "email": db_user.get("email")
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Login Crash for {email}: {str(e)}")
        return {"status": "error", "message": str(e)}

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
        
        # Calculate total calories from the AI's breakdown
        total_calories = 0
        for meal in ['breakfast', 'lunch', 'dinner']:
            if meal in ai_plan and 'calories' in ai_plan[meal]:
                try:
                    total_calories += int(ai_plan[meal]['calories'])
                except (ValueError, TypeError):
                    pass

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
                "total_food_calories": total_calories,
                "last_updated": datetime.now()
            }},
            upsert=True
        )
        return {"plan": ai_plan, "total_calories": total_calories}
    except Exception as e:
        return {"error": str(e)}

@app.post("/log-meal")
async def log_meal(data: dict = Body(...)):
    user_email = data.get('email')
    meal_type = data.get('mealType', 'snack').lower()
    food_desc = data.get('foodDesc', '')
    today = get_today()
    
    if not food_desc:
        return {"error": "No food description provided"}

    try:
        # 1. Ask Gemini to estimate calories
        prompt = f"""
        Analyze this {meal_type} meal: {food_desc}.
        Estimate the total calories.
        Return ONLY JSON format exactly like this:
        {{
            "calories": 450,
            "items": ["item1", "item2"]
        }}
        """
        response = model.generate_content(prompt)
        ai_data = json.loads(clean_ai_json(response.text))
        added_calories = int(ai_data.get('calories', 0))

        # 2. Fetch current record to update total
        current_record = await health_collection.find_one({"email": user_email, "date": today})
        current_total = 0
        current_meals = {}
        
        if current_record:
             current_total = current_record.get("total_food_calories", 0)
             current_meals = current_record.get("quick_meals", {})
             
        # Add new meal
        current_meals[meal_type] = {
             "desc": food_desc,
             "calories": added_calories,
             "items": ai_data.get('items', [])
        }
        
        new_total = current_total + added_calories

        # 3. Update Database
        await health_collection.update_one(
            {"email": user_email, "date": today},
            {"$set": {
                "quick_meals": current_meals,
                "total_food_calories": new_total,
                "last_updated": datetime.now()
            }},
            upsert=True
        )
        
        return {
            "status": "success", 
            "meal": current_meals[meal_type],
            "added_calories": added_calories,
            "new_total": new_total
        }
    except Exception as e:
        print(f"Log Meal Error: {e}")
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

# --- Weekly Activity & Real-time Stats ---
@app.get("/weekly-activity/{email}")
async def get_weekly_activity(email: str):
    today = datetime.now()
    seven_days_ago = today - timedelta(days=6)
    
    cursor = health_collection.find({
        "email": email,
        "date": {"$gte": seven_days_ago.strftime("%Y-%m-%d")}
    })
    
    db_data = await cursor.to_list(length=7)
    db_map = {item["date"]: item.get("user_inputs", {}).get("steps", 0) for item in db_data}
    
    final_data = []
    for i in range(7):
        current_date = (seven_days_ago + timedelta(days=i))
        date_str = current_date.strftime("%Y-%m-%d")
        
        # Determine steps (could be numeric or string)
        steps_val = db_map.get(date_str, 0)
        try:
            steps_count = int(steps_val)
        except (ValueError, TypeError):
            steps_count = 0
            
        final_data.append({
            "name": current_date.strftime("%a"),
            "steps": steps_count
        })
    
    return final_data

@app.post("/save-health-inputs")
async def save_health_inputs(data: dict = Body(...)):
    user_email = data.get('email')
    today = get_today()
    
    # 1. Save Base Profile Height if provided
    height_val = data.get('height')
    if height_val:
         await user_collection.update_one(
             {"email": user_email},
             {"$set": {"height": height_val}}
         )
    
    # We expect: bp (e.g., "120/80"), sugar, steps, workoutTime, weight
    try:
        await health_collection.update_one(
            {"email": user_email, "date": today},
            {"$set": {
                "health_metrics": {
                    "bp": data.get('bp', ""),
                    "sugar": data.get('sugar', ""),
                    "steps": data.get('steps', 0),
                    "workoutTime": data.get('workoutTime', 0),
                    "weight": data.get('weight', "")
                },
                "last_updated": datetime.now()
            }},
            upsert=True
        )
        return {"status": "success", "message": "Health data logged successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/user/health-stats/{email}")
async def get_health_stats(email: str):
    today = get_today()
    
    # Needs two queries: one for permanent profile height, one for today's dynamic metrics
    user_profile = await user_collection.find_one({"email": email})
    user_data = await health_collection.find_one({"email": email, "date": today})
    
    # Default values
    steps = 0
    calories_burned = 0
    active_time = 0
    heart_rate = "72"
    blood_pressure = "120/80"
    health_score = 85
    sugar_val = 100
    bmi = None
    weight_val = None
    height_val = user_profile.get("height") if user_profile else None
    
    if user_data:
        metrics = user_data.get("health_metrics", {})
        
        # Parse inputs, fallback to user_inputs if they only used the old diet planner for steps
        steps_val = metrics.get("steps", user_data.get("user_inputs", {}).get("steps", 0))
        try:
            steps = int(steps_val)
        except (ValueError, TypeError):
            steps = 0
            
        calories_burned = int(steps * 0.04)
        active_time_val = metrics.get("workoutTime", 0)
        try:
            active_time = int(active_time_val) if active_time_val else int(steps // 100)
        except (ValueError, TypeError):
             active_time = int(steps // 100)
             
        blood_pressure = metrics.get("bp", "120/80") or "120/80"
        try:
            sugar_val = int(metrics.get("sugar", 100) or 100)
        except:
            sugar_val = 100
            
        weight_val = metrics.get("weight")
        total_food_calories = user_data.get("total_food_calories", 0)
        
        # Calculate BMI
        if height_val and weight_val:
             try:
                 h_meters = float(height_val) / 100
                 w_kg = float(weight_val)
                 bmi = round(w_kg / (h_meters * h_meters), 1)
             except (ValueError, TypeError):
                 bmi = None
                 
        # ML Health Score Prediction
        if health_score_model is not None:
             try:
                 # Parse BP
                 bp_parts = blood_pressure.split('/')
                 sys_bp = int(bp_parts[0]) if len(bp_parts) == 2 else 120
                 dia_bp = int(bp_parts[1]) if len(bp_parts) == 2 else 80
                 
                 # Prepare feature array: ['systolic_bp', 'diastolic_bp', 'sugar', 'steps', 'workout_time']
                 features = [[sys_bp, dia_bp, sugar_val, steps, active_time]]
                 predicted_score = health_score_model.predict(features)[0]
                 health_score = int(np.clip(predicted_score, 0, 100))
             except Exception as e:
                 print(f"ML Prediction Error: {e}")
                 pass

    return {
        "steps": steps,
        "calories": f"{calories_burned} kcal",
        "time": f"{active_time} mins",
        "heartRate": heart_rate,
        "bloodPressure": blood_pressure,
        "healthScore": health_score,
        "bmi": bmi,
        "height": height_val,
        "weight": weight_val,
        "total_food_calories": total_food_calories,
        "calories_burned": calories_burned,
        "status": {
            "heart": "Normal",
            "bp": "Elevated" if int(blood_pressure.split('/')[0] if '/' in blood_pressure else 120) > 130 else "Normal",
            "steps": "Excellent" if steps > 8000 else "Improving",
            "score": "Excellent" if health_score > 90 else "Good" if health_score > 75 else "Needs Work"
        }
    }
