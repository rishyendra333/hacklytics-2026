import os
import re
import time
import traceback
from dotenv import load_dotenv
from supabase import create_client, Client
from nba_api.stats.endpoints import leaguegamelog, playbyplayv3, boxscoretraditionalv3

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Request headers to avoid 403s from NBA API
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com',
}


def fetch_with_retry(fetch_fn, retries=2, delay=2.0):
    """Retry a fetch function with exponential backoff."""
    for attempt in range(retries + 1):
        try:
            return fetch_fn()
        except Exception as e:
            if attempt < retries:
                wait = delay * (2 ** attempt)
                print(f"    Attempt {attempt + 1} failed: {e}. Retrying in {wait:.1f}s...")
                time.sleep(wait)
            else:
                raise


def parse_v3_clock(clock_str):
    """
    Parse ISO 8601 duration clock from PlayByPlayV3.
    Format: 'PT12M00.00S' -> (12, 0) -> minutes, seconds
    """
    if not clock_str:
        return 0, 0
    match = re.match(r'PT(\d+)M([\d.]+)S', str(clock_str))
    if match:
        return int(match.group(1)), int(float(match.group(2)))
    return 0, 0


def compute_momentum_vector(plays, home_team_id, total_seconds=2880, num_buckets=20):
    """
    Computes a 20-point momentum vector from PlayByPlayV3 data.
    V3 has: description, teamId, period, clock (ISO 8601), actionType, shotResult, etc.
    """
    bucket_size = total_seconds / num_buckets
    raw_vector = [0.0] * num_buckets

    for play in plays:
        try:
            period = int(play.get('period', 0))
            clock_str = play.get('clock', '')
            if period == 0:
                continue

            mins, secs = parse_v3_clock(clock_str)
            period_seconds = 720 if period <= 4 else 300
            elapsed_in_period = period_seconds - (mins * 60 + secs)

            if period <= 4:
                total_elapsed = (period - 1) * 720 + elapsed_in_period
            else:
                total_elapsed = 2880 + (period - 5) * 300 + elapsed_in_period

            bucket_idx = min(int(total_elapsed / bucket_size), num_buckets - 1)
        except (ValueError, KeyError, TypeError):
            continue

        # Skip non-team events
        team_id = play.get('teamId', 0)
        if not team_id or team_id == 0:
            continue

        desc = str(play.get('description') or '').lower()
        action_type = str(play.get('actionType') or '').lower()
        shot_result = str(play.get('shotResult') or '').lower()

        # Home = positive momentum, Away = negative
        multiplier = 1.0 if str(team_id) == str(home_team_id) else -1.0

        score = 0.0

        # Scoring
        if shot_result == 'made':
            if action_type == '3pt':
                score += 3.0
            elif action_type == '2pt':
                score += 2.0
            elif action_type == 'freethrow':
                score += 1.0

        # Turnovers
        if action_type == 'turnover' or 'turnover' in desc:
            score -= 2.0

        # Blocks and steals (high momentum impact)
        if 'block' in action_type or 'block' in desc:
            score += 1.5
        if 'steal' in action_type or 'steal' in desc:
            score += 1.5

        # Dunks (exciting plays)
        if 'dunk' in desc:
            score += 1.0

        # Fast breaks
        if 'fast break' in desc:
            score += 1.5

        raw_vector[bucket_idx] += (score * multiplier)

    # Rolling cumulative sum
    rolling_vector = [0.0] * num_buckets
    current_sum = 0.0
    for i in range(num_buckets):
        current_sum += raw_vector[i]
        rolling_vector[i] = current_sum

    # Normalize to -1 to 1 range
    max_abs = max(abs(max(rolling_vector)), abs(min(rolling_vector)))
    if max_abs == 0:
        max_abs = 1.0

    normalized = [round(val / max_abs, 3) for val in rolling_vector]
    return normalized


def get_final_score(game_id):
    """Fetch final score from boxscore V3. Returns e.g. '116-117'."""
    try:
        def fetch():
            return boxscoretraditionalv3.BoxScoreTraditionalV3(
                game_id=game_id,
                headers=HEADERS
            )

        boxscore = fetch_with_retry(fetch, retries=1, delay=1.5)
        dfs = boxscore.get_data_frames()

        # DF index 2 = team totals (2 rows, one per team)
        team_totals = dfs[2]
        if team_totals is not None and len(team_totals) >= 2:
            scores = []
            for _, row in team_totals.iterrows():
                pts = int(row.get('points', 0))
                scores.append(pts)
            if len(scores) >= 2:
                return f"{scores[0]}-{scores[1]}"

    except Exception as e:
        print(f"    Could not fetch boxscore: {e}")

    return "Unknown"


def get_home_team_id_from_gamelog(games_df, game_id):
    """
    Determine home team ID from the game log.
    In the game log, 'vs.' in MATCHUP means home game, '@' means away.
    """
    game_rows = games_df[games_df['GAME_ID'] == game_id]
    for _, row in game_rows.iterrows():
        matchup = str(row.get('MATCHUP', ''))
        if ' vs. ' in matchup:
            # This team is the home team
            return row.get('TEAM_ID')
    return None


def main():
    print("=" * 60)
    print("  MOMENTUM SHIFT - Historical Data Pipeline")
    print("=" * 60)
    print()

    # Determine the current NBA season
    from datetime import datetime
    current_year = datetime.now().year
    if datetime.now().month >= 7:
        season = f"{current_year}-{str(current_year + 1)[-2:]}"
    else:
        season = f"{current_year - 1}-{str(current_year)[-2:]}"

    print(f"Target season: {season}")
    print(f"Fetching game log...\n")

    # Fetch the league game log (has all games with TEAM_ID info)
    try:
        def fetch_gamelog():
            return leaguegamelog.LeagueGameLog(
                season=season,
                season_type_all_star='Regular Season',
                headers=HEADERS
            )

        gamelog = fetch_with_retry(fetch_gamelog, retries=2, delay=3.0)
        all_games_df = gamelog.get_data_frames()[0]
    except Exception as e:
        print(f"Error fetching game log for {season}: {e}")
        print("Trying fallback to 2024-25 season...")
        try:
            season = '2024-25'

            def fetch_fallback():
                return leaguegamelog.LeagueGameLog(
                    season=season,
                    season_type_all_star='Regular Season',
                    headers=HEADERS
                )

            gamelog = fetch_with_retry(fetch_fallback, retries=2, delay=3.0)
            all_games_df = gamelog.get_data_frames()[0]
        except Exception as e2:
            print(f"Fallback also failed: {e2}")
            return

    # Get unique games, sorted by most recent
    unique_games = all_games_df.drop_duplicates(subset=['GAME_ID'])
    unique_games = unique_games.sort_values(by='GAME_DATE', ascending=False).head(50)

    total_games = len(unique_games)
    print(f"Found {total_games} unique games to process.\n")

    games_processed = 0
    games_skipped = 0
    games_failed = 0

    for idx, (_, game) in enumerate(unique_games.iterrows()):
        game_id = str(game['GAME_ID'])
        matchup = game['MATCHUP']
        game_date = game['GAME_DATE']
        progress = f"[{idx + 1}/{total_games}]"

        # Check if already exists
        try:
            response = supabase.table('game_fingerprints').select('id').eq('game_id', game_id).execute()
            if len(response.data) > 0:
                print(f"{progress} {matchup} ({game_date}) — already in DB, skipping.")
                games_skipped += 1
                continue
        except Exception as e:
            print(f"{progress} Error checking DB for {game_id}: {e}")
            games_failed += 1
            continue

        print(f"{progress} Processing {matchup} ({game_date})...")

        # Rate limiting
        time.sleep(1.0)

        # Get home team ID from game log first
        home_team_id = get_home_team_id_from_gamelog(all_games_df, game_id)

        # Fetch play-by-play using V3
        try:
            def fetch_pbp():
                return playbyplayv3.PlayByPlayV3(
                    game_id=game_id,
                    headers=HEADERS
                )

            pbp = fetch_with_retry(fetch_pbp, retries=2, delay=2.0)
            dfs = pbp.get_data_frames()

            # Find the PlayByPlay dataframe (has 'period' and 'clock' columns)
            plays_df = None
            for df in dfs:
                if df is not None and not df.empty and 'period' in df.columns and 'clock' in df.columns:
                    plays_df = df
                    break

            if plays_df is None or plays_df.empty:
                print(f"    No play-by-play data available. Skipping.")
                games_failed += 1
                continue

            plays = plays_df.to_dict('records')
            if len(plays) < 20:
                print(f"    Only {len(plays)} plays found (too few). Skipping.")
                games_failed += 1
                continue

            # If we couldn't get home_team_id from gamelog, try to infer from plays
            if home_team_id is None:
                # Look at the first few plays with team IDs to find the unique teams
                team_ids = set()
                for p in plays:
                    tid = p.get('teamId', 0)
                    if tid and tid != 0:
                        team_ids.add(tid)
                if len(team_ids) == 2:
                    home_team_id = list(team_ids)[0]  # Best guess
                    print(f"    Warning: Guessing home team ID as {home_team_id}")

        except Exception as e:
            print(f"    Failed to fetch play-by-play: {e}")
            games_failed += 1
            if "timeout" in str(e).lower() or "rate" in str(e).lower():
                print(f"    Rate limited — waiting 5s...")
                time.sleep(5)
            continue

        # Parse team names from matchup string
        if ' vs. ' in matchup:
            parts = matchup.split(' vs. ')
            home_team, away_team = parts[0].strip(), parts[1].strip()
        elif ' @ ' in matchup:
            parts = matchup.split(' @ ')
            away_team, home_team = parts[0].strip(), parts[1].strip()
        else:
            home_team, away_team = "Unknown", "Unknown"

        # Compute momentum vector
        momentum_vector = compute_momentum_vector(plays, home_team_id)

        # Check if vector is all zeros
        if all(v == 0.0 for v in momentum_vector):
            print(f"    Momentum vector is all zeros. Skipping.")
            games_failed += 1
            continue

        # Fetch final score from boxscore
        time.sleep(0.6)
        final_score = get_final_score(game_id)

        # Insert into Supabase
        record = {
            "game_id": game_id,
            "season": season,
            "home_team": home_team,
            "away_team": away_team,
            "final_score": final_score,
            "momentum_vector": momentum_vector,
            "metadata": {"game_date": game_date}
        }

        try:
            supabase.table('game_fingerprints').insert(record).execute()
            print(f"    Stored successfully. Score: {final_score}")
            games_processed += 1
        except Exception as e:
            print(f"    Failed to insert into DB: {e}")
            games_failed += 1

    print()
    print("=" * 60)
    print(f"  Pipeline Complete!")
    print(f"  Processed: {games_processed}")
    print(f"  Skipped (already in DB): {games_skipped}")
    print(f"  Failed: {games_failed}")
    print("=" * 60)


if __name__ == "__main__":
    main()
