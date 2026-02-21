import os
import random
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_random_vector(trend_type="balanced"):
    """
    Generates a realistic-looking 20-point momentum vector.
    """
    vector = [0.0]
    current = 0.0
    
    for _ in range(19):
        # Random step between -0.3 and 0.3
        step = random.uniform(-0.3, 0.3)
        
        if trend_type == "home_blowout":
            step = random.uniform(0.0, 0.3)
        elif trend_type == "away_blowout":
            step = random.uniform(-0.3, 0.0)
        elif trend_type == "comeback_home":
            # Away starts strong, home finishes strong
            if _ < 10:
                step = random.uniform(-0.3, 0.1)
            else:
                step = random.uniform(0.0, 0.4)
                
        current += step
        
        # Cap between -1 and 1
        current = max(-1.0, min(1.0, current))
        vector.append(round(current, 3))
        
    return vector

MOCK_GAMES = [
    {"home": "Celtics", "away": "Heat", "score": "118-104", "trend": "home_blowout"},
    {"home": "Lakers", "away": "Nuggets", "score": "105-114", "trend": "away_blowout"},
    {"home": "Warriors", "away": "Suns", "score": "122-119", "trend": "comeback_home"},
    {"home": "Bucks", "away": "76ers", "score": "110-108", "trend": "balanced"},
    {"home": "Knicks", "away": "Pacers", "score": "130-101", "trend": "home_blowout"},
    {"home": "Mavericks", "away": "Clippers", "score": "98-105", "trend": "balanced"},
    {"home": "Timberwolves", "away": "Thunder", "score": "112-115", "trend": "balanced"},
    {"home": "Cavaliers", "away": "Magic", "score": "104-103", "trend": "comeback_home"},
    {"home": "Pelicans", "away": "Kings", "score": "125-100", "trend": "home_blowout"},
    {"home": "Bulls", "away": "Hawks", "score": "120-118", "trend": "balanced"},
    {"home": "Heat", "away": "Celtics", "score": "95-120", "trend": "away_blowout"},
    {"home": "Suns", "away": "Timberwolves", "score": "116-122", "trend": "balanced"},
    {"home": "Pacers", "away": "Knicks", "score": "121-89", "trend": "home_blowout"},
    {"home": "Nuggets", "away": "Lakers", "score": "108-106", "trend": "balanced"},
    {"home": "Thunder", "away": "Mavericks", "score": "111-120", "trend": "away_blowout"},
]

def main():
    print("Seeding mock game fingerprints into Supabase...")
    
    inserted = 0
    for i, game in enumerate(MOCK_GAMES):
        game_id = f"mock_{1000 + i}"
        
        # Check if exists
        try:
            response = supabase.table('game_fingerprints').select('id').eq('game_id', game_id).execute()
            if len(response.data) > 0:
                print(f"Game {game_id} already exists. Skipping.")
                continue
        except Exception as e:
            print(f"Error checking {game_id}: {e}")
            continue
            
        vector = generate_random_vector(game["trend"])
        
        record = {
            "game_id": game_id,
            "season": "2023-24",
            "home_team": game["home"],
            "away_team": game["away"],
            "final_score": game["score"],
            "momentum_vector": vector,
            "metadata": {"mock_data": True, "trend": game["trend"]}
        }
        
        try:
            supabase.table('game_fingerprints').insert(record).execute()
            print(f"Inserted {game['home']} vs {game['away']}")
            inserted += 1
        except Exception as e:
            print(f"Error inserting {game_id}: {e}")
            
    print(f"Done. Inserted {inserted} new mock games.")

if __name__ == "__main__":
    main()
