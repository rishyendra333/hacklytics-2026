import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'run_predictor.pkl')
model = None

def load_model():
    """Loads the scikit-learn model into memory."""
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        return True
    return False

def predict_run(momentum_window: list[float], score_diff: float) -> dict:
    """
    Predicts if a momentum run is imminent.
    momentum_window: The last 5 momentum buckets (floats -1 to 1)
    score_diff: Current score differential (momentum value from frontend, will be normalized to bucket index)
    
    The training script uses bucket index (0-19) as the 6th feature. Since the frontend passes
    a momentum value, we estimate the bucket index based on the momentum window position.
    For simplicity, we use the average of the momentum window values to estimate progress.
    """
    if model is None:
        if not load_model():
            # If model isn't trained yet, return a safe dummy response
            # so the frontend doesn't crash during early development.
            return {
                "run_probability": 0.5,
                "confidence": "low",
                "message": "(Mock) Run Predictor Offline"
            }
            
    # Input validation
    if len(momentum_window) < 5:
        # Pad with 0s if we don't have enough data yet
        padded = [0.0] * (5 - len(momentum_window)) + momentum_window
    else:
        padded = momentum_window[-5:]
    
    # Map score_diff (momentum value) to a bucket index estimate (0-19)
    # The training script expects bucket index as the 6th feature
    # The frontend passes momentum in range -100 to 100
    # We normalize it to 0-19 range: map -100->0, 0->10, +100->19
    # This gives us a reasonable proxy for game progress based on momentum
    normalized_score = (score_diff + 100) / 200.0  # Normalize to 0-1
    estimated_bucket = int(normalized_score * 19)  # Map to 0-19
    estimated_bucket = max(0, min(19, estimated_bucket))  # Clamp to valid range
        
    features = np.array(padded + [estimated_bucket]).reshape(1, -1)
    
    try:
        # predict_proba returns [[P(class 0), P(class 1)]]
        prob_run = model.predict_proba(features)[0][1]
        
        confidence = "medium"
        if prob_run > 0.75 or prob_run < 0.25:
            confidence = "high"
            
        message = ""
        # Determine direction based on the latest momentum
        last_momentum = padded[-1]
        if prob_run > 0.6:
            if last_momentum > 0.1:
                message = "Home team showing signs of a momentum run."
            elif last_momentum < -0.1:
                message = "Away team showing signs of a momentum run."
            else:
                message = "Game flow indicating a potential breakout."
        else:
            message = "Game flow looks stable."
            
        return {
            "run_probability": round(float(prob_run), 3),
            "confidence": confidence,
            "message": message
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        return {
            "run_probability": 0.0,
            "confidence": "low",
            "message": "Error calculating prediction."
        }
