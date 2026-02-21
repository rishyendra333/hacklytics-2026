import os
import json
import numpy as np
from contextlib import asynccontextmanager
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv

# Import ML model
from ml.predictor import predict_run, load_model

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    # Don't exit immediately so tests/health checks can run without DB

class PredictRunRequest(BaseModel):
    momentum_window: List[float]
    score_diff: float

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load ML Model on startup
    if load_model():
        print("Run Predictor model loaded successfully.")
    else:
        print("Warning: Run Predictor model not found. API will return mock predictions.")
    yield
    # Cleanup on shutdown
    pass

app = FastAPI(title="Momentum Shift API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase Client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "https://your-project-id.supabase.co":
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized successfully")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
        supabase = None
else:
    print("Supabase credentials not configured - using mock data mode")

def get_supabase():
    if supabase is None:
        raise HTTPException(status_code=500, detail="Database connection not configured")
    return supabase

def cosine_similarity(v1, v2):
    """Calculate cosine similarity between two numeric arrays."""
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/predict-run")
def api_predict_run(request: PredictRunRequest):
    try:
        prediction = predict_run(request.momentum_window, request.score_diff)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/similar-games")
def get_similar_games(
    momentum_vector: str = Query(..., description="Comma-separated list of EXACTLY 20 floats representing the game fingerprint"),
    top_k: int = Query(5, description="Number of results to return")
):
    try:
        target_vector = [float(x) for x in momentum_vector.split(",")]
        if len(target_vector) != 20:
            raise ValueError("momentum_vector must contain exactly 20 values.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
        
    stored_games = []
    
    # Try fetching from DB if configured
    try:
        if supabase is not None:
            try:
                response = supabase.table("game_fingerprints").select("*").execute()
                stored_games = response.data if response.data else []
            except Exception as e:
                print(f"Database query failed, falling back to mock: {e}")
                stored_games = []
    except Exception as e:
        print(f"Database access error, using mock data: {e}")
        stored_games = []
            
    # Requirements Check: If DB has fewer than 10 records (or not configured), return mock data
    if len(stored_games) < 10:
        return {
            "using_mock_data": True,
            "results": [
                {
                    "game_id": "mock_game_1",
                    "home_team": "Bulls",
                    "away_team": "Knicks",
                    "final_score": "100-98",
                    "season": "mock",
                    "similarity_score": 0.942
                },
                {
                    "game_id": "mock_game_2",
                    "home_team": "Lakers",
                    "away_team": "Celtics",
                    "final_score": "114-110",
                    "season": "mock",
                    "similarity_score": 0.887
                },
                {
                    "game_id": "mock_game_3",
                    "home_team": "Warriors",
                    "away_team": "Cavaliers",
                    "final_score": "104-91",
                    "season": "mock",
                    "similarity_score": 0.811
                }
            ][:top_k]
        }
        
    similarities = []
    
    # Needs to match against full 20-point vectors in the DB
    for game in stored_games:
        db_vector = game.get("momentum_vector")
        if not db_vector or len(db_vector) != 20:
            continue
            
        sim = cosine_similarity(target_vector, db_vector)
        
        # Format the result object
        similarities.append({
            "game_id": game["game_id"],
            "home_team": game["home_team"],
            "away_team": game["away_team"],
            "final_score": game.get("final_score", "Unknown"),
            "season": game.get("season", "Unknown"),
            "similarity_score": round(float(sim), 3)
        })
        
    # Sort descending
    similarities.sort(key=lambda x: x["similarity_score"], reverse=True)
    
    return {
        "using_mock_data": False,
        "results": similarities[:top_k]
    }

@app.get("/api/player-impact/{player_name}")
def get_player_impact(player_name: str):
    if supabase is None:
        raise HTTPException(status_code=404, detail=f"No impact data found for player: {player_name} (Database not connected)")
        
    try:
        # Case insensitive exact match for simplicity
        response = supabase.table("player_momentum_impact").select("*").ilike("player_name", player_name).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail=f"No impact data found for player: {player_name}")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
