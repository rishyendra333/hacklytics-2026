import os
import joblib
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from supabase import create_client, Client
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'run_predictor.pkl')

def create_training_samples(vector):
    """
    Given a 20-point momentum vector, generates sliding window samples.
    Window size = 5. Target = average of next 3 > 0.3.
    """
    samples = []
    # Need 5 context + 3 future = 8 points minimum to create a sample
    for i in range(len(vector) - 7):
        window = vector[i:i+5]
        future = vector[i+5:i+8]
        
        # Determine the sign of the momentum to see who has advantage
        # For simplicity, we define a "run" as the absolute momentum shifting by > 0.3
        # OR the momentum staying very high.
        
        # A simple target: Does the momentum average > 0.3 in the same direction?
        # Let's define the label based on the home team's perspective for training.
        # Run = 1 if avg(future) > 0.3 AND avg(future) > avg(window)
        # OR if avg(future) < -0.3 AND avg(future) < avg(window)
        
        avg_future = sum(future) / 3
        avg_window = sum(window) / 5
        
        is_significant_run = 0
        if (avg_future > 0.3 and avg_future > avg_window) or \
           (avg_future < -0.3 and avg_future < avg_window):
            is_significant_run = 1
            
        # Features: [w1, w2, w3, w4, w5, current_bucket_idx]
        features = window + [i + 4] # i+4 is the index of the last bucket in the window
        
        samples.append({
            "features": features,
            "label": is_significant_run
        })
        
    return samples

def main():
    print("Fetching game fingerprints for training...")
    
    # Fetch all fingerprints
    all_data = []
    try:
        response = supabase.table('game_fingerprints').select('momentum_vector').execute()
        all_data = response.data
    except Exception as e:
        print(f"Error fetching from Supabase: {e}")
        return
        
    if not all_data:
        print("No data found in Supabase. Please run the data pipeline first.")
        return
        
    print(f"Found {len(all_data)} games. Generating sliding window samples...")
    
    X = []
    y = []
    
    for game in all_data:
        vector = game['momentum_vector']
        if len(vector) != 20:
            continue
            
        samples = create_training_samples(vector)
        for s in samples:
            X.append(s['features'])
            y.append(s['label'])
            
    if len(X) == 0:
        print("Not enough valid vectors to generate samples.")
        return
        
    X = np.array(X)
    y = np.array(y)
    
    print(f"Generated {len(y)} total samples. Target runs: {sum(y)} ({round(sum(y)/len(y)*100, 1)}%)")
    
    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training LogisticRegression model...")
    # Use class_weight='balanced' because "runs" are relatively rare events
    model = LogisticRegression(class_weight='balanced', max_iter=1000)
    model.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = model.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {acc:.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save Model
    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

if __name__ == "__main__":
    main()
