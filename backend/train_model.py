import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib
import os

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    
    # Generate random features
    systolic_bp = np.random.normal(120, 15, num_samples).astype(int)
    diastolic_bp = np.random.normal(80, 10, num_samples).astype(int)
    sugar = np.random.normal(100, 20, num_samples).astype(int)
    steps = np.random.normal(6000, 3000, num_samples).astype(int)
    workout_time = np.random.normal(30, 20, num_samples).astype(int)
    
    # Ensure realistic bounds
    systolic_bp = np.clip(systolic_bp, 90, 180)
    diastolic_bp = np.clip(diastolic_bp, 60, 120)
    sugar = np.clip(sugar, 70, 200)
    steps = np.clip(steps, 0, 20000)
    workout_time = np.clip(workout_time, 0, 120)
    
    # Calculate a deterministic "true" health score to train the model on
    # Base score is 100
    base_score = 100
    
    # Penalties for high BP
    bp_penalty = np.where((systolic_bp > 130) | (diastolic_bp > 85), 10, 0)
    bp_penalty = np.where((systolic_bp > 140) | (diastolic_bp > 90), 20, bp_penalty)
    
    # Penalties for high sugar
    sugar_penalty = np.where(sugar > 140, 15, 0)
    sugar_penalty = np.where(sugar > 180, 30, sugar_penalty)
    
    # Rewards for steps and workout
    step_reward = np.where(steps > 8000, 10, 0)
    step_reward = np.where(steps > 12000, 15, step_reward)
    
    workout_reward = np.where(workout_time > 30, 10, 0)
    workout_reward = np.where(workout_time > 60, 15, workout_reward)
    
    health_score = base_score - bp_penalty - sugar_penalty + step_reward + workout_reward
    
    # Add some random noise to make it realistic for ML
    health_score = health_score + np.random.normal(0, 5, num_samples)
    health_score = np.clip(health_score, 0, 100).astype(int)
    
    df = pd.DataFrame({
        'systolic_bp': systolic_bp,
        'diastolic_bp': diastolic_bp,
        'sugar': sugar,
        'steps': steps,
        'workout_time': workout_time,
        'health_score': health_score
    })
    
    return df

def train_and_save_model():
    print("Generating synthetic data...")
    df = generate_synthetic_data(5000)
    
    X = df[['systolic_bp', 'diastolic_bp', 'sugar', 'steps', 'workout_time']]
    y = df['health_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForest Regression model...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    train_preds = model.predict(X_train)
    test_preds = model.predict(X_test)
    
    print(f"Train RMSE: {np.sqrt(mean_squared_error(y_train, train_preds)):.2f}")
    print(f"Test RMSE: {np.sqrt(mean_squared_error(y_test, test_preds)):.2f}")
    
    model_path = os.path.join(os.path.dirname(__file__), 'health_model.pkl')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_and_save_model()
