# Python Backend for Momentum Shift

This directory contains the Python FastAPI backend that powers the Machine Learning features of the Momentum Shift dashboard (Game DNA pattern matcher and Run Predictor).

## Prerequisites
- Python 3.10+
- A Supabase Project (see `/SETUP.md` at the project root)

## Setup

1. **Install Dependencies:**
   Make sure you are in the `backend` directory.
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Create a `.env` file in the `backend` directory with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-anon-public-key-here
   ```
   Get these values from your Supabase project: Project Settings -> API

3. **Database Setup:**
   Run the SQL in `schema.sql` in your Supabase SQL Editor. See `/SETUP.md` for detailed instructions.

4. **Seed Initial Data:**
   To test the dashboard immediately, run the mock data seeder:
   ```bash
   python pipeline/seed_mock_data.py
   ```

## Running the Data Pipeline (Historical NBA Data)
To fetch real NBA play-by-play data and populate your database with real "Game Fingerprints":
```bash
python pipeline/fetch_historical.py
```
*Note: This takes about 5 minutes because it sleeps between requests to avoid NBA API rate limits.*

## Training the Run Predictor Model
Once you have data in Supabase (mock or real), train the LogisticRegression model:
```bash
python ml/train_run_predictor.py
```
This will save a `run_predictor.pkl` file in the `ml/` directory.

## Starting the Server
To run the FastAPI server locally on port 8000:
```bash
uvicorn main:app --reload --port 8000
```
(Or simply run the `start.sh` script at the root of the project to start both the frontend and backend together).

## API Endpoints
- `GET /health` : Returns server status.
- `GET /api/similar-games?momentum_vector=...&top_k=3` : Returns the most similar historical games based on cosine similarity of their momentum DNA.
- `POST /api/predict-run` : Accepts a 5-bucket momentum window and predicts if a run is incoming.
- `GET /api/player-impact/{player_name}` : Returns player impact stats.
