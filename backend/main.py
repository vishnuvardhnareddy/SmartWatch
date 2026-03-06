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
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, EmailStr
from database import user_collection, database # Ensure database.py exports 'database'
from dotenv import load_dotenv
import joblib
import numpy as np
import resend

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

# Compress responses > 500 bytes (faster transfers)
app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create MongoDB indexes on startup for fast queries
@app.on_event("startup")
async def create_indexes():
    # Email index on users — makes login/signup find_one() instant
    # Removed unique=True so old duplicate sandbox accounts don't crash the server
    await user_collection.create_index("email")
    # Compound index on health logs — speeds up ALL daily queries
    await health_collection.create_index([("email", 1), ("date", -1)])
    print("MongoDB indexes created.")

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

# bcrypt is used directly (not via passlib) for better compatibility on Render

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
        salt = bcrypt.gensalt(rounds=8)  # 8 rounds = fast on free-tier, still secure (used by many apps)
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
        snacks_text = data.get('snacks', '')
        snacks_line = f", Snacks:{snacks_text}" if snacks_text else ""
        
        prompt = f"""
        Analyze Indian meals: Breakfast:{data.get('breakfast')}, Lunch:{data.get('lunch')}, Dinner:{data.get('dinner')}{snacks_line}.
        Return ONLY JSON:
        {{
          "breakfast": {{"items": [], "calories": 0}},
          "lunch": {{"items": [], "calories": 0}},
          "dinner": {{"items": [], "calories": 0}},
          "snacks": {{"items": [], "calories": 0}},
          "tip": "Sassy Indian health tip"
        }}
        """
        response = model.generate_content(prompt)
        ai_plan = json.loads(clean_ai_json(response.text))
        
        # Calculate total calories from the AI's breakdown
        total_calories = 0
        for meal in ['breakfast', 'lunch', 'dinner', 'snacks']:
            if meal in ai_plan and 'calories' in ai_plan[meal]:
                try:
                    total_calories += int(ai_plan[meal]['calories'])
                except (ValueError, TypeError):
                    pass

        # Save water intake if provided
        water_intake = data.get('water', 0)

        # DB Storage: Update if exists, else create (saves storage)
        await health_collection.update_one(
            {"email": user_email, "date": today},
            {"$set": {
                "user_inputs": {
                    "breakfast": data.get('breakfast'),
                    "lunch": data.get('lunch'),
                    "dinner": data.get('dinner'),
                    "snacks": snacks_text
                },
                "ai_diet_plan": ai_plan,
                "total_food_calories": total_calories,
                "water_intake": water_intake,
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
    
    # 1. Save Base Profile (height + latest weight) to user collection
    profile_update = {}
    height_val = data.get('height')
    weight_val = data.get('weight')
    if height_val:
        profile_update["height"] = height_val
    if weight_val:
        profile_update["weight"] = weight_val
    
    if profile_update:
        await user_collection.update_one(
            {"email": user_email},
            {"$set": profile_update}
        )
    
    # 2. Save daily health metrics
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

# --- Log Workout (user input) ---
@app.post("/log-workout")
async def log_workout(data: dict = Body(...)):
    user_email = data.get('email')
    today = get_today()
    
    workout_type = data.get('workoutType', 'general')
    duration = data.get('duration', 0)  # minutes
    calories_burned = data.get('caloriesBurned', 0)
    
    try:
        # Get existing workouts for today
        record = await health_collection.find_one({"email": user_email, "date": today})
        existing_workouts = record.get("workouts", []) if record else []
        
        new_workout = {
            "type": workout_type,
            "duration": int(duration),
            "calories_burned": int(calories_burned),
            "logged_at": datetime.now().strftime("%H:%M")
        }
        existing_workouts.append(new_workout)
        
        # Calculate totals
        total_workout_time = sum(w.get("duration", 0) for w in existing_workouts)
        total_workout_calories = sum(w.get("calories_burned", 0) for w in existing_workouts)
        
        await health_collection.update_one(
            {"email": user_email, "date": today},
            {"$set": {
                "workouts": existing_workouts,
                "health_metrics.workoutTime": total_workout_time,
                "total_workout_calories": total_workout_calories,
                "last_updated": datetime.now()
            }},
            upsert=True
        )
        
        return {
            "status": "success",
            "workout": new_workout,
            "total_workout_time": total_workout_time,
            "total_workout_calories": total_workout_calories
        }
    except Exception as e:
        print(f"Log Workout Error: {e}")
        return {"error": str(e)}

# --- Fetch Diet Plan from DB ---
@app.get("/get-diet-plan/{email}")
async def get_diet_plan(email: str):
    today = get_today()
    record = await health_collection.find_one({"email": email, "date": today})
    
    if record and record.get("ai_diet_plan"):
        return {
            "status": "success",
            "plan": record["ai_diet_plan"],
            "total_calories": record.get("total_food_calories", 0),
            "water_intake": record.get("water_intake", 0)
        }
    return {"status": "no_plan", "plan": None}

@app.get("/user/health-stats/{email}")
async def get_health_stats(email: str):
    today = get_today()
    
    # Two queries: permanent profile + today's dynamic metrics
    user_profile = await user_collection.find_one({"email": email})
    user_data = await health_collection.find_one({"email": email, "date": today})
    
    # Default values
    steps = 0
    calories_burned = 0
    active_time = 0
    heart_rate = "72"
    blood_pressure = "120/80"
    health_score = 50
    sugar_val = 100
    total_food_calories = 0
    total_workout_calories = 0
    water_intake = 0
    bmi = None
    weight_val = None
    height_val = user_profile.get("height") if user_profile else None
    workouts = []
    
    if user_data:
        metrics = user_data.get("health_metrics", {})
        
        # Parse steps
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
            
        weight_val = metrics.get("weight") or (user_profile.get("weight") if user_profile else None)
        total_food_calories = user_data.get("total_food_calories", 0)
        total_workout_calories = user_data.get("total_workout_calories", 0)
        water_intake = user_data.get("water_intake", 0)
        workouts = user_data.get("workouts", [])
        
        # Add workout calories to total burned
        calories_burned += total_workout_calories
        
        # Calculate BMI
        if height_val and weight_val:
            try:
                h_meters = float(height_val) / 100
                w_kg = float(weight_val)
                bmi = round(w_kg / (h_meters * h_meters), 1)
            except (ValueError, TypeError):
                bmi = None
                 
        # --- Health Score Calculation ---
        # Try ML model first, fallback to rule-based scoring
        if health_score_model is not None:
            try:
                bp_parts = blood_pressure.split('/')
                sys_bp = int(bp_parts[0]) if len(bp_parts) == 2 else 120
                dia_bp = int(bp_parts[1]) if len(bp_parts) == 2 else 80
                features = [[sys_bp, dia_bp, sugar_val, steps, active_time]]
                predicted_score = health_score_model.predict(features)[0]
                health_score = int(np.clip(predicted_score, 0, 100))
            except Exception as e:
                print(f"ML Prediction Error: {e}")
                health_score = _calculate_rule_based_score(steps, active_time, blood_pressure, sugar_val, total_food_calories, water_intake, bmi)
        else:
            health_score = _calculate_rule_based_score(steps, active_time, blood_pressure, sugar_val, total_food_calories, water_intake, bmi)

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
        "total_workout_calories": total_workout_calories,
        "water_intake": water_intake,
        "workouts": workouts,
        "status": {
            "heart": "Normal",
            "bp": "Elevated" if int(blood_pressure.split('/')[0] if '/' in blood_pressure else 120) > 130 else "Normal",
            "steps": "Excellent" if steps > 8000 else "Improving",
            "score": "Excellent" if health_score > 90 else "Good" if health_score > 75 else "Needs Work"
        }
    }


def _calculate_rule_based_score(steps, workout_time, bp, sugar, food_calories, water, bmi):
    """Calculate health score (0-100) based on all available data."""
    score = 50  # Base score
    
    # Steps (max +15): 8000+ steps is excellent
    if steps >= 8000:
        score += 15
    elif steps >= 5000:
        score += 10
    elif steps >= 2000:
        score += 5
    
    # Workout (max +15): 30+ mins is great
    if workout_time >= 45:
        score += 15
    elif workout_time >= 30:
        score += 12
    elif workout_time >= 15:
        score += 7
    elif workout_time > 0:
        score += 3
    
    # Blood Pressure (max +10)
    try:
        bp_parts = bp.split('/')
        sys_bp = int(bp_parts[0]) if len(bp_parts) == 2 else 120
        dia_bp = int(bp_parts[1]) if len(bp_parts) == 2 else 80
        if 90 <= sys_bp <= 120 and 60 <= dia_bp <= 80:
            score += 10  # Normal range
        elif 120 < sys_bp <= 140 or 80 < dia_bp <= 90:
            score += 5   # Slightly elevated
        # else: 0 points (high BP)
    except:
        score += 5  # Default if BP not parseable
    
    # Sugar (max +10): 70-110 is normal fasting range
    if 70 <= sugar <= 110:
        score += 10
    elif 110 < sugar <= 140:
        score += 5
    # else: 0 (high sugar)
    
    # Food Calories (max +10): 1500-2500 is healthy range
    if 1500 <= food_calories <= 2500:
        score += 10
    elif 1200 <= food_calories < 1500 or 2500 < food_calories <= 3000:
        score += 5
    elif food_calories > 0:
        score += 2  # At least they logged food
    
    # Water (max +5): 2.5L+ is great
    try:
        water_val = float(water)
        if water_val >= 2.5:
            score += 5
        elif water_val >= 1.5:
            score += 3
        elif water_val > 0:
            score += 1
    except:
        pass
    
    # BMI bonus (max +5): 18.5-24.9 is normal
    if bmi is not None:
        if 18.5 <= bmi <= 24.9:
            score += 5
        elif 25 <= bmi <= 29.9:
            score += 2
    
    return min(100, max(0, score))


# --- Email Report via Resend ---
resend.api_key = os.getenv("RESEND_API_KEY")

@app.post("/send-report")
async def send_report(data: dict = Body(...)):
    user_email = data.get('email')
    today = get_today()
    
    if not user_email:
        return {"error": "Email is required"}
    
    try:
        # 1. Gather all data for today
        user_profile = await user_collection.find_one({"email": user_email})
        user_data = await health_collection.find_one({"email": user_email, "date": today})
        
        username = user_profile.get("username", "User") if user_profile else "User"
        
        # Health metrics
        metrics = {}
        health_score = 50
        if user_data:
            metrics = user_data.get("health_metrics", {})
        
        bp = metrics.get("bp", "Not logged")
        sugar = metrics.get("sugar", "Not logged")
        weight = metrics.get("weight", user_profile.get("weight", "Not logged") if user_profile else "Not logged")
        height = user_profile.get("height", "Not logged") if user_profile else "Not logged"
        steps = metrics.get("steps", 0)
        workout_time = metrics.get("workoutTime", 0)
        
        # Food data
        user_inputs = user_data.get("user_inputs", {}) if user_data else {}
        food_breakfast = user_inputs.get("breakfast", "Not logged")
        food_lunch = user_inputs.get("lunch", "Not logged")
        food_dinner = user_inputs.get("dinner", "Not logged")
        food_snacks = user_inputs.get("snacks", "Not logged")
        total_food_calories = user_data.get("total_food_calories", 0) if user_data else 0
        water_intake = user_data.get("water_intake", 0) if user_data else 0
        
        # Workout data
        workouts = user_data.get("workouts", []) if user_data else []
        total_workout_calories = user_data.get("total_workout_calories", 0) if user_data else 0
        
        # Build workout rows for email
        workout_rows = ""
        if workouts:
            for w in workouts:
                workout_rows += f"""<tr>
                    <td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;'>{w.get('type','—')}</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;'>{w.get('duration',0)} mins</td>
                    <td style='padding:8px 12px;border-bottom:1px solid #f1f5f9;'>{w.get('calories_burned',0)} kcal</td>
                </tr>"""
        else:
            workout_rows = "<tr><td colspan='3' style='padding:12px;color:#94a3b8;text-align:center;'>No workouts logged today</td></tr>"
        
        # 2. Get AI Summary with improvement suggestions
        ai_summary = "Stay consistent with your health routine!"
        try:
            ai_prompt = f"""
            You are a friendly Indian health coach. Analyze this user's daily health data and give a short, actionable summary.
            
            Health: BP={bp}, Sugar={sugar}, Steps={steps}, Workout={workout_time}min, Weight={weight}kg, Height={height}cm
            Food: Breakfast={food_breakfast}, Lunch={food_lunch}, Dinner={food_dinner}, Snacks={food_snacks}
            Total Calories Eaten: {total_food_calories}, Water: {water_intake}L
            Workout Calories Burned: {total_workout_calories}
            
            Give response in this format (plain text, 4-5 lines max):
            - Line 1: Overall assessment (1 sentence)
            - Line 2: What to improve
            - Line 3: What to avoid in food
            - Line 4: Exercise recommendation
            - Line 5: Motivational tip
            """
            ai_response = model.generate_content(ai_prompt)
            ai_summary = ai_response.text.strip()
        except Exception as e:
            print(f"AI Summary Error: {e}")
        
        # Format AI summary lines as HTML
        ai_summary_html = "".join([f"<p style='margin:4px 0;color:#334155;font-size:14px;'>{'🔹 ' if line.strip().startswith('-') else ''}{line.strip().lstrip('- ')}</p>" for line in ai_summary.split('\n') if line.strip()])
        
        # 3. Build beautiful HTML email
        html_body = f"""
        <div style='font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;'>
            
            <!-- Header -->
            <div style='background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;'>
                <h1 style='color:white;margin:0;font-size:24px;'>🩺 Nutrivitals Daily Report</h1>
                <p style='color:#d1fae5;margin:8px 0 0;font-size:14px;'>{today} • {username}</p>
            </div>
            
            <div style='padding:24px;'>
                
                <!-- Health Log -->
                <div style='margin-bottom:24px;'>
                    <h2 style='color:#0f172a;font-size:18px;margin:0 0 12px;border-bottom:2px solid #10b981;padding-bottom:6px;'>❤️ Health Log</h2>
                    <table style='width:100%;border-collapse:collapse;'>
                        <tr><td style='padding:6px 0;color:#64748b;width:40%;'>Blood Pressure</td><td style='padding:6px 0;color:#0f172a;font-weight:600;'>{bp if bp else 'Not logged'}</td></tr>
                        <tr><td style='padding:6px 0;color:#64748b;'>Blood Sugar</td><td style='padding:6px 0;color:#0f172a;font-weight:600;'>{sugar if sugar else 'Not logged'} {'mg/dL' if sugar else ''}</td></tr>
                        <tr><td style='padding:6px 0;color:#64748b;'>Weight</td><td style='padding:6px 0;color:#0f172a;font-weight:600;'>{weight} {'kg' if weight != 'Not logged' else ''}</td></tr>
                        <tr><td style='padding:6px 0;color:#64748b;'>Steps</td><td style='padding:6px 0;color:#0f172a;font-weight:600;'>{steps}</td></tr>
                        <tr><td style='padding:6px 0;color:#64748b;'>Water Intake</td><td style='padding:6px 0;color:#0f172a;font-weight:600;'>{water_intake} L</td></tr>
                    </table>
                </div>
                
                <!-- Food Log -->
                <div style='margin-bottom:24px;'>
                    <h2 style='color:#0f172a;font-size:18px;margin:0 0 12px;border-bottom:2px solid #f59e0b;padding-bottom:6px;'>🍽️ Food Taken Today</h2>
                    <table style='width:100%;border-collapse:collapse;'>
                        <tr><td style='padding:6px 0;color:#64748b;width:40%;'>Breakfast</td><td style='padding:6px 0;color:#0f172a;'>{food_breakfast or 'Not logged'}</td></tr>
                        <tr><td style='padding:6px 0;color:#64748b;'>Lunch</td><td style='padding:6px 0;color:#0f172a;'>{food_lunch or 'Not logged'}</td></tr>
                        <tr><td style='padding:6px 0;color:#64748b;'>Dinner</td><td style='padding:6px 0;color:#0f172a;'>{food_dinner or 'Not logged'}</td></tr>
                        <tr><td style='padding:6px 0;color:#64748b;'>Snacks</td><td style='padding:6px 0;color:#0f172a;'>{food_snacks or 'Not logged'}</td></tr>
                        <tr><td style='padding:6px 0;color:#64748b;font-weight:600;'>Total Calories</td><td style='padding:6px 0;color:#ef4444;font-weight:700;font-size:16px;'>{total_food_calories} kcal</td></tr>
                    </table>
                </div>
                
                <!-- Workout Summary -->
                <div style='margin-bottom:24px;'>
                    <h2 style='color:#0f172a;font-size:18px;margin:0 0 12px;border-bottom:2px solid #8b5cf6;padding-bottom:6px;'>🏋️ Workout Summary</h2>
                    <table style='width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;'>
                        <tr style='background:#e2e8f0;'>
                            <th style='padding:10px 12px;text-align:left;color:#475569;font-size:13px;'>Type</th>
                            <th style='padding:10px 12px;text-align:left;color:#475569;font-size:13px;'>Duration</th>
                            <th style='padding:10px 12px;text-align:left;color:#475569;font-size:13px;'>Calories</th>
                        </tr>
                        {workout_rows}
                    </table>
                    <p style='margin:8px 0 0;color:#64748b;font-size:13px;'>Total Workout Calories Burned: <strong style='color:#8b5cf6;'>{total_workout_calories} kcal</strong></p>
                </div>
                
                <!-- AI Summary -->
                <div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:16px;'>
                    <h2 style='color:#166534;font-size:16px;margin:0 0 10px;'>🤖 AI Health Coach Summary</h2>
                    {ai_summary_html}
                </div>
                
                <!-- Footer -->
                <div style='text-align:center;padding:16px 0 0;border-top:1px solid #e2e8f0;'>
                    <p style='color:#94a3b8;font-size:12px;margin:0;'>Sent from Nutrivitals AI • Stay Healthy 💪</p>
                </div>
            </div>
        </div>
        """
        
        # 4. Send via Resend
        params = {
            "from": "Nutrivitals <onboarding@resend.dev>",
            "to": ["vr4507@gmail.com"],
            "subject": f"🩺 Your Nutrivitals Daily Health Report — {today}",
            "html": html_body
        }
        
        email_response = resend.Emails.send(params)
        print(f"Report sent to {user_email}: {email_response}")
        
        return {"status": "success", "message": f"Report sent to {user_email}"}
        
    except Exception as e:
        print(f"Send Report Error: {e}")
        return {"status": "error", "message": str(e)}
