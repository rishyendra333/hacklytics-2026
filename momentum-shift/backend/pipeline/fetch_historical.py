import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client
from nba_api.stats.endpoints import leaguegamelog, playbyplayv2

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def compute_momentum_vector(plays, home_team_id, total_seconds=2880, num_buckets=20):
    """
    Computes a 20-point momentum vector from play-by-play data using the specified algorithm.
    """
    bucket_size = total_seconds / num_buckets
    raw_vector = [0.0] * num_buckets
    
    for play in plays:
        # Extract play details
        try:
            period = int(play['PERIOD'])
            pctimestring = play['PCTIMESTRING']
            mins, secs = map(int, pctimestring.split(':'))
            # Calculate total seconds elapsed
            period_seconds = 720 if period <= 4 else 300 # 12 mins for Q1-4, 5 mins for OT
            elapsed_in_period = period_seconds - (mins * 60 + secs)
            
            total_elapsed = 0
            if period <= 4:
                total_elapsed = (period - 1) * 720 + elapsed_in_period
            else:
                total_elapsed = 2880 + (period - 5) * 300 + elapsed_in_period
                
            bucket_idx = min(int(total_elapsed / bucket_size), num_buckets - 1)
        except (ValueError, KeyError, TypeError):
            continue # Skip malformed time strings

        desc = play['HOMEDESCRIPTION'] or play['VISITORDESCRIPTION'] or play['NEUTRALDESCRIPTION'] or ""
        desc = desc.lower()
        
        # Determine team context
        is_home_play = bool(play['HOMEDESCRIPTION'])
        is_visitor_play = bool(play['VISITORDESCRIPTION'])
        multiplier = 1.0 if is_home_play else -1.0 if is_visitor_play else 0.0
        
        # We only care about plays with a description tied to a team
        if multiplier == 0:
            continue
            
        score = 0.0
        
        # Scoring Algorithm
        if '3pt' in desc and 'made' in desc:
            score += 3.0
        elif 'made' in desc and 'free throw' not in desc:
            score += 2.0
            
        if 'free throw' in desc and 'made' in desc:
            score += 1.0
            
        if 'turnover' in desc:
            score -= 2.0
            
        if 'fast break' in desc:
            score += 1.5
            
        raw_vector[bucket_idx] += (score * multiplier)

    # Apply rolling sum within the vector to represent cumulative momentum shifts
    rolling_vector = [0.0] * num_buckets
    current_sum = 0.0
    for i in range(num_buckets):
        current_sum += raw_vector[i]
        rolling_vector[i] = current_sum
        
    # Normalize to -1 to 1 range
    max_abs = max(max(iter(rolling_vector)), abs(min(iter(rolling_vector))))
    if max_abs == 0:
        max_abs = 1.0 # Prevent division by zero
        
    normalized = [round(val / max_abs, 3) for val in rolling_vector]
    return normalized

def main():
    print("Starting historical data fetch...")
    
    # Get recent games
    try:
        # Fetching regular season games for current season (assuming 2023-24 or similar)
        # nba_api defaults to current/latest season if not specified
        gamelog = leaguegamelog.LeagueGameLog(season='2023-24', season_type_all_star='Regular Season')
        games_df = gamelog.get_data_frames()[0]
    except Exception as e:
        print(f"Error fetching game log: {e}")
        return

    # We need unique game IDs. The game log has one row per team per game.
    unique_games = games_df.drop_duplicates(subset=['GAME_ID'])
    
    # Sort by date descending and take top 50
    unique_games = unique_games.sort_values(by='GAME_DATE', ascending=False).head(50)
    
    games_processed = 0
    games_skipped = 0
    
    for index, game in unique_games.iterrows():
        game_id = str(game['GAME_ID'])
        matchup = game['MATCHUP']
        
        # Check if already exists in Supabase
        try:
            response = supabase.table('game_fingerprints').select('id').eq('game_id', game_id).execute()
            if len(response.data) > 0:
                print(f"Game {game_id} ({matchup}) already exists. Skipping.")
                games_skipped += 1
                continue
        except Exception as e:
            print(f"Error checking Supabase for {game_id}: {e}")
            continue
            
        print(f"Fetching play-by-play for {game_id} ({matchup})...")
        
        try:
            # Rate limiting
            time.sleep(0.6)
            
            pbp = playbyplayv2.PlayByPlayV2(game_id=game_id)
            plays_df = pbp.get_data_frames()[0]
            plays = plays_df.to_dict('records')
            
            # Extract basic game info
            # Matchup format is usually "ATL vs. BOS" or "ATL @ BOS"
            teams = matchup.split(' vs. ')
            if len(teams) != 2:
                teams = matchup.split(' @ ')
            
            if len(teams) == 2:
                # In '@', teams[1] is home. In 'vs.', teams[0] is home.
                if ' @ ' in matchup:
                    away_team, home_team = teams[0], teams[1]
                else:
                    home_team, away_team = teams[0], teams[1]
            else:
                home_team, away_team = "Unknown", "Unknown"
                
            # Compute vector
            # We don't have explicit home_team_id here easily without another API call,
            # but our compute function infers logic based on HOMEDESCRIPTION vs VISITORDESCRIPTION
            momentum_vector = compute_momentum_vector(plays, home_team_id=None)
            
            # Prepare record
            record = {
                "game_id": game_id,
                "season": "2023-24",
                "home_team": home_team,
                "away_team": away_team,
                "final_score": "Unknown", # Would need boxscore for this, simplifying for now
                "momentum_vector": momentum_vector,
                "metadata": {"game_date": game['GAME_DATE']}
            }
            
            # Insert into Supabase
            supabase.table('game_fingerprints').insert(record).execute()
            print(f"Successfully processed and stored {game_id}")
            games_processed += 1
            
        except Exception as e:
            print(f"Error processing {game_id}: {e}")
            
    print(f"\nPipeline finished. Processed: {games_processed}, Skipped: {games_skipped}")

if __name__ == "__main__":
    main()
