# Momentum Shift - Complete Setup Guide

**⚠️ Complete this setup before running `start.sh` or the backend will crash on startup.**

This guide will walk you through setting up the entire Momentum Shift application, including the React frontend, Python FastAPI backend, and Supabase database.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Frontend Setup](#frontend-setup)
3. [Backend Setup](#backend-setup)
4. [Supabase Database Setup](#supabase-database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Schema Setup](#database-schema-setup)
7. [Seed Initial Data](#seed-initial-data)
8. [Train ML Model (Optional)](#train-ml-model-optional)
9. [Running the Application](#running-the-application)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)** - [Download](https://nodejs.org/)
- **Python 3.10 or higher** - [Download](https://www.python.org/downloads/)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)
- A **GitHub account** (for Supabase sign-in)

Verify your installations:
```bash
node --version    # Should show v18.x or higher
npm --version     # Should show 9.x or higher
python3 --version # Should show Python 3.10.x or higher
```

---

## Frontend Setup

The frontend is a React application built with Vite, TypeScript, and Tailwind CSS.

1. **Navigate to the project root:**
   ```bash
   cd momentum-shift
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```
   
   This will install all frontend dependencies including React, Vite, Recharts, Axios, and Tailwind CSS.

3. **Verify frontend setup:**
   The frontend will automatically start when you run `start.sh` or `npm run dev`. No additional configuration needed.

---

## Backend Setup

The backend is a Python FastAPI application that provides ML-powered analytics.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment:**
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment:**
   
   **On macOS/Linux:**
   ```bash
   source venv/bin/activate
   ```
   
   **On Windows:**
   ```bash
   venv\Scripts\activate
   ```
   
   You should see `(venv)` in your terminal prompt.

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   
   This installs:
   - `fastapi` - Web framework
   - `uvicorn` - ASGI server
   - `supabase` - Database client
   - `nba_api` - NBA data API
   - `pandas`, `numpy` - Data processing
   - `scikit-learn`, `joblib` - Machine learning
   - `python-dotenv` - Environment variables
   - `httpx` - HTTP client

5. **Verify backend setup:**
   ```bash
   python -c "import fastapi, uvicorn, supabase; print('✓ All dependencies installed')"
   ```

---

## Supabase Database Setup

Momentum Shift uses Supabase (PostgreSQL) to store game fingerprints and player impact data.

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** and sign in with your GitHub account
3. Click **"New Project"** in the dashboard
4. Fill in the project details:
   - **Name**: `momentum-shift` (or any name you prefer)
   - **Database Password**: Create a strong password and **save it securely** (you'll need it later)
   - **Region**: Choose the region closest to you for better performance
5. Click **"Create new project"** and wait ~2 minutes for provisioning

### Step 2: Get Your API Credentials

1. Once your project is ready, go to **Project Settings** (gear icon in the left sidebar)
2. Click on **API** in the settings menu

3. **Finding the Project URL:**
   
   The Project URL might not be directly visible. Here are ways to find it:
   
   **Option A: Check the General Settings Tab**
   - Go to **Project Settings** → **General** (instead of API)
   - Look for **"Reference ID"** or **"Project Reference"** 
   - Your Project URL is: `https://[YOUR-REFERENCE-ID].supabase.co`
   - Example: If Reference ID is `abcdefghijklmnop`, URL is `https://abcdefghijklmnop.supabase.co`
   
   **Option B: Use the Project ID you see**
   - In the API settings, you mentioned seeing a **Project ID**
   - The Project URL format is: `https://[PROJECT-ID].supabase.co`
   - Simply replace `[PROJECT-ID]` with the ID you see
   - Example: If Project ID is `xyz123abc`, URL is `https://xyz123abc.supabase.co`
   
   **Option C: Check the URL bar**
   - When you're in your Supabase project dashboard, look at the browser URL
   - It might show something like: `https://app.supabase.com/project/[PROJECT-ID]`
   - Use that `[PROJECT-ID]` to construct: `https://[PROJECT-ID].supabase.co`
   
   **The Project URL should look like:** `https://xxxxxxxxxxxxx.supabase.co`

4. **Finding the API Key:**
   
   In the **API** settings tab, you should see:
   - **Project API keys** section with multiple keys
   - Look for the key labeled **"anon"** or **"public"** (NOT "service_role")
   - This is the key you need - it's safe to use in your code
   - Copy the entire key (it's a long JWT token starting with `eyJ...`)
   - If you only see one key labeled "Secret API key", that might be the service_role key - you need the anon/public key instead

5. **What you need:**
   - **Project URL**: `https://[your-project-id].supabase.co` (constructed from Project ID)
   - **API Key**: The `anon` `public` key from the API keys section

6. **Copy both values** - you'll need them in the next step.

---

## Environment Configuration

Create the `.env` file to configure your backend connection to Supabase.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a `.env` file:**
   ```bash
   touch .env
   ```
   
   Or create it manually in your text editor.

3. **Add your Supabase credentials:**
   ```env
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_KEY=your-anon-public-key-here
   ```
   
   Replace:
   - `https://xxxxxxxxxxxxx.supabase.co` with your actual Project URL
   - `your-anon-public-key-here` with your actual `anon` `public` API key

4. **Verify the file was created:**
   ```bash
   cat .env
   ```
   
   You should see your credentials (don't share this file publicly!).

---

## Database Schema Setup

Now we'll create the database tables that store game fingerprints and player impact data.

1. **Open your Supabase project dashboard**

2. **Go to the SQL Editor:**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Copy the schema:**
   - Open the file `backend/schema.sql` in your project
   - Copy the entire contents (both CREATE TABLE statements)

4. **Paste and run:**
   - Paste the SQL into the Supabase SQL Editor
   - Click **"Run"** (or press `Cmd+Enter` / `Ctrl+Enter`)
   - You should see "Success" with no errors

5. **Verify tables were created:**
   - Go to **"Table Editor"** in the left sidebar
   - You should see two tables:
     - `game_fingerprints` - Stores historical game momentum vectors
     - `player_momentum_impact` - Stores player impact statistics

---

## Seed Initial Data

To test the application immediately, we'll seed the database with realistic mock data.

1. **Make sure you're in the backend directory with venv activated:**
   ```bash
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Run the seed script:**
   ```bash
   python pipeline/seed_mock_data.py
   ```
   
   You should see output like:
   ```
   Seeding mock game fingerprints into Supabase...
   Inserted Celtics vs Heat
   Inserted Lakers vs Nuggets
   ...
   Done. Inserted 15 new mock games.
   ```

3. **Verify data in Supabase:**
   - Go to **Table Editor** → `game_fingerprints`
   - You should see 15 rows of mock game data

### Optional: Fetch Real NBA Data

If you want to populate the database with real historical NBA games:

```bash
python pipeline/fetch_historical.py
```

**Note:** This takes ~5 minutes because it:
- Fetches play-by-play data for 50 recent NBA games
- Sleeps 0.6 seconds between API calls to avoid rate limits
- Processes and stores momentum vectors for each game

---

## Train ML Model (Optional)

The Run Predictor uses a machine learning model to predict momentum runs. Train it after you have data in the database.

1. **Make sure you have data in Supabase:**
   - Either from the seed script (15 mock games) or
   - From the historical pipeline (50+ real games)

2. **Train the model:**
   ```bash
   python ml/train_run_predictor.py
   ```
   
   You should see output like:
   ```
   Fetching game fingerprints for training...
   Found 15 games. Generating sliding window samples...
   Generated 180 total samples. Target runs: 45 (25.0%)
   Training LogisticRegression model...
   Evaluating model...
   
   Accuracy: 0.750
   
   Classification Report:
   ...
   
   Model saved to backend/ml/run_predictor.pkl
   ```

3. **Verify the model file:**
   ```bash
   ls -la ml/run_predictor.pkl
   ```
   
   The file should exist. Without it, the Run Predictor will return mock predictions.

---

## Running the Application

You can start both the frontend and backend together using the provided script.

### Option 1: Using start.sh (Recommended)

1. **Make sure you're in the project root:**
   ```bash
   cd momentum-shift  # or wherever your project root is
   ```

2. **Make the script executable (if needed):**
   ```bash
   chmod +x start.sh
   ```

3. **Start the application:**
   ```bash
   ./start.sh
   ```
   
   This will:
   - Start the Python FastAPI backend on `http://localhost:8000`
   - Start the React frontend on `http://localhost:5173`
   - Start the Node.js proxy server on `http://localhost:3001`

4. **Open your browser:**
   - Navigate to `http://localhost:5173`
   - You should see the Momentum Shift dashboard

5. **Stop the application:**
   - Press `Ctrl+C` in the terminal
   - Both servers will stop

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd momentum-shift  # project root
npm run dev
```

---

## Application Architecture

Once running, you'll have:

- **Frontend (React)**: `http://localhost:5173`
  - React + TypeScript + Vite
  - Displays momentum charts, game DNA analysis, and run predictions

- **Backend (FastAPI)**: `http://localhost:8000`
  - Python FastAPI server
  - ML endpoints for predictions and similarity matching

- **Proxy Server (Node.js)**: `http://localhost:3001`
  - Express server that proxies ESPN API requests
  - Provides game data and play-by-play information

---

## API Endpoints

Once the backend is running, you can test these endpoints:

### Health Check
```bash
curl http://localhost:8000/health
# Returns: {"status":"ok"}
```

### Predict Run
```bash
curl -X POST http://localhost:8000/api/predict-run \
  -H "Content-Type: application/json" \
  -d '{"momentum_window": [0.1, 0.3, 0.5, 0.4, 0.6], "score_diff": 4.0}'
```

### Similar Games
```bash
curl "http://localhost:8000/api/similar-games?momentum_vector=0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0&top_k=3"
```

---

## Troubleshooting

### Backend Issues

**Problem: "Database connection not configured"**
- **Solution**: Make sure your `.env` file exists in the `backend/` directory with correct `SUPABASE_URL` and `SUPABASE_KEY` values

**Problem: "ModuleNotFoundError: No module named 'X'"**
- **Solution**: Make sure your virtual environment is activated and run `pip install -r requirements.txt`

**Problem: "Failed to initialize Supabase client"**
- **Solution**: 
  - Verify your `.env` file has the correct credentials
  - Make sure you're using the `anon` `public` key, not the `service_role` key
  - Check that your Supabase project is active (not paused)

**Problem: "relation does not exist"**
- **Solution**: The database schema wasn't created. Go back to [Database Schema Setup](#database-schema-setup) and run the SQL in Supabase SQL Editor

### Frontend Issues

**Problem: "Cannot connect to backend"**
- **Solution**: 
  - Make sure the backend is running on port 8000
  - Check that `http://localhost:8000/health` returns `{"status":"ok"}`
  - Verify CORS is enabled (it should be by default)

**Problem: "npm install fails"**
- **Solution**: 
  - Make sure you have Node.js v18+ installed
  - Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

### Database Issues

**Problem: "No data found" or mock data always showing**
- **Solution**: 
  - Run the seed script: `python backend/pipeline/seed_mock_data.py`
  - Check Supabase Table Editor to verify data exists
  - Make sure you have at least 10 game fingerprints for real data to show

**Problem: "Auth errors from Python client"**
- **Solution**: 
  - Double-check you copied the `anon` `public` key (not `service_role`)
  - Verify the key is correct in your `.env` file
  - Make sure there are no extra spaces or quotes in your `.env` file

**Problem: "Can't find Project URL in API settings"**
- **Solution**: 
  - Go to **Project Settings** → **General** tab
  - Look for **"Reference ID"** or **"Project Reference"**
  - Construct the URL as: `https://[REFERENCE-ID].supabase.co`
  - Or use the Project ID you see: `https://[PROJECT-ID].supabase.co`

**Problem: "Only see 'Secret API key' but no 'anon' key"**
- **Solution**: 
  - The "Secret API key" is usually the `service_role` key (don't use this)
  - Scroll down in the API settings - the `anon` `public` key should be below
  - Look for a section labeled **"Project API keys"** with multiple keys listed
  - The `anon` key is typically the first one listed and labeled as "anon" or "public"
  - If you still can't find it, try refreshing the page or check if your project is fully provisioned

### Model Training Issues

**Problem: "No data found in Supabase" when training**
- **Solution**: Run the seed script first: `python backend/pipeline/seed_mock_data.py`

**Problem: Model file not found**
- **Solution**: Train the model: `python backend/ml/train_run_predictor.py`
- The model will work without training (returns mock predictions), but accuracy will be better with a trained model

---

## Next Steps

Once everything is set up:

1. **Explore the dashboard** - Watch live games and see momentum analysis
2. **Check Game DNA** - See which historical games match the current game's momentum pattern
3. **Watch for Run Predictions** - The ⚡ badge appears when a momentum run is predicted
4. **Add more data** - Run `fetch_historical.py` to add more real NBA games
5. **Retrain the model** - After adding more data, retrain for better predictions

---

## Support

If you encounter issues not covered here:

1. Check the terminal output for error messages
2. Verify all prerequisites are installed correctly
3. Ensure all environment variables are set
4. Check that Supabase project is active and accessible
5. Review the troubleshooting section above

Happy analyzing! 🏀📊
