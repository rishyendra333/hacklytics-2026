# Momentum Shift - Project Overview

## What is Momentum Shift?

**Momentum Shift** is an intelligent sports analytics platform that provides real-time momentum analysis for NBA games. It combines live game data, machine learning, and historical pattern matching to give fans, analysts, and coaches deeper insights into game flow and momentum dynamics.

---

## The Problem It Solves

Traditional basketball analytics focus on static statistics (points, rebounds, assists) but miss the **dynamic flow** of a game. Momentum shifts—those critical moments when a game changes direction—are often invisible in traditional stats. Momentum Shift answers questions like:

- **"Is this game heading toward a blowout or a comeback?"**
- **"Which team has the momentum right now, and how strong is it?"**
- **"Have we seen this momentum pattern before? How did those games end?"**
- **"Is a scoring run about to happen?"**

---

## Key Features

### 1. **Real-Time Momentum Visualization** 📊

- **Live Momentum Chart**: A dynamic area chart showing momentum shifts throughout the game
  - Positive values (green) = Home team advantage
  - Negative values (red) = Away team advantage
  - Updates every 15 seconds during live games
  - Shows momentum impact of each play

- **Play-by-Play Feed**: Real-time feed of game events with momentum impact scores
  - Each play shows its contribution to momentum
  - Color-coded by team
  - Scrollable history of the entire game

### 2. **Game DNA Pattern Matcher** 🧬

- **Historical Similarity Matching**: Compares the current game's momentum pattern to thousands of historical games
- **"This game is playing out like..."**: Shows the top 3 most similar historical games
- **Predictive Insights**: See how similar games ended to predict potential outcomes
- **Uses Cosine Similarity**: Advanced mathematical matching of 20-point momentum vectors

**Example**: If the current game shows a pattern of early away team dominance followed by a home team comeback, it will match against historical games with similar patterns and show their final scores.

### 3. **Live Run Predictor** ⚡

- **ML-Powered Predictions**: Uses a trained LogisticRegression model to predict momentum runs
- **Real-Time Alerts**: Shows a pulsing badge when a scoring run is likely (>60% probability)
- **Confidence Levels**: High, medium, or low confidence predictions
- **30-Second Updates**: Continuously analyzes the last 5 momentum buckets to predict the next 3

**Example**: If a team has been building momentum over the last few minutes, the predictor might show "⚡ Run Incoming (75%)" indicating a high probability of a scoring burst.

### 4. **Game Intelligence Narrative** 📝

- **AI-Generated Insights**: Automatically generates human-readable descriptions of game flow
- **Context-Aware**: Analyzes recent momentum changes to provide narrative
- **Updates Dynamically**: Changes as the game progresses

**Example**: "The Warriors are building significant momentum right now with a flurry of positive plays."

---

## How It Works

### Momentum Calculation Algorithm

Momentum Shift uses a sophisticated algorithm to calculate game momentum:

1. **Play-by-Play Analysis**: Processes every play in the game
2. **Scoring System**:
   - **+3 points** for made 3-pointers
   - **+2 points** for made 2-pointers
   - **+1 point** for made free throws
   - **-2 points** for turnovers
   - **+1.5 points** for fast break points
   - Values are **negated for away team** (home team advantage)

3. **Time Bucketing**: Splits the game into 20 equal time buckets
4. **Rolling Sum**: Applies cumulative momentum within each bucket
5. **Normalization**: Normalizes the entire vector to -1 to +1 range
   - **+1** = Maximum home team momentum
   - **-1** = Maximum away team momentum
   - **0** = Even game

6. **Result**: A 20-point "fingerprint" vector that uniquely represents the game's momentum pattern

### Machine Learning Pipeline

#### Game DNA Matching

1. **Data Collection**: Historical games are processed and stored as 20-point momentum vectors
2. **Similarity Calculation**: Uses cosine similarity to find games with matching patterns
3. **Ranking**: Returns top K most similar games with similarity scores

#### Run Predictor

1. **Training Data**: Generates training samples by sliding a 5-bucket window across historical games
2. **Feature Engineering**: 
   - 5 momentum values (current window)
   - Score differential bucket index
3. **Label**: Binary classification (1 = run incoming, 0 = stable)
   - A "run" is defined as momentum averaging >0.3 in the next 3 buckets
4. **Model**: LogisticRegression with balanced class weights
5. **Prediction**: Real-time predictions based on current game state

---

## Architecture

Momentum Shift is built as a **full-stack application** with three main components:

### Frontend (React + TypeScript)
- **Location**: `src/` directory
- **Technology**: React 19, TypeScript, Vite, Tailwind CSS, Recharts
- **Port**: `5173`
- **Features**:
  - Real-time momentum visualization
  - Interactive charts and UI components
  - API integration with backend
  - Responsive design

### Backend (Python FastAPI)
- **Location**: `backend/` directory
- **Technology**: FastAPI, Python 3.10+, scikit-learn, numpy, pandas
- **Port**: `8000`
- **Features**:
  - ML model serving
  - Game DNA similarity matching
  - Run prediction API
  - Supabase database integration

### Proxy Server (Node.js Express)
- **Location**: `server/` directory
- **Technology**: Express.js, Axios
- **Port**: `3001`
- **Features**:
  - Proxies ESPN API requests
  - Fetches live game data
  - Calculates momentum from play-by-play
  - CORS handling

### Database (Supabase/PostgreSQL)
- **Technology**: Supabase (PostgreSQL)
- **Tables**:
  - `game_fingerprints`: Stores historical game momentum vectors
  - `player_momentum_impact`: Stores player impact statistics (future feature)

---

## Data Flow

```
1. ESPN API → Proxy Server (Node.js)
   ↓
2. Play-by-Play Data → Momentum Algorithm
   ↓
3. Calculated Momentum → Frontend (React)
   ↓
4. Frontend → Backend API (FastAPI)
   ↓
5. Backend → ML Models → Predictions
   ↓
6. Backend → Supabase → Historical Matching
   ↓
7. Results → Frontend → User Interface
```

### Real-Time Flow

1. **Game Selection**: App finds live or recent games from ESPN API
2. **Data Polling**: Every 15 seconds, fetches latest play-by-play data
3. **Momentum Calculation**: Proxy server calculates momentum for each play
4. **Visualization**: Frontend updates the chart in real-time
5. **ML Analysis**: 
   - Every 30 seconds: Run Predictor analyzes last 5 buckets
   - After 15+ plays: Game DNA matches against historical games
6. **Display**: Results shown in UI with badges, cards, and narratives

---

## Use Cases

### For Fans 🏀
- **Enhanced Viewing Experience**: Understand game flow beyond the score
- **Predictive Insights**: Know when exciting moments are about to happen
- **Historical Context**: See how current games compare to memorable past games

### For Analysts 📈
- **Pattern Recognition**: Identify recurring momentum patterns across seasons
- **Game Flow Analysis**: Quantify momentum shifts that traditional stats miss
- **Predictive Modeling**: Use ML predictions for betting or analysis

### For Coaches 🎯
- **Timeout Timing**: Know when momentum is shifting against your team
- **Strategic Decisions**: Understand when to push or hold back
- **Historical Learning**: Learn from similar game situations

### For Developers 💻
- **ML Integration Example**: See how to integrate scikit-learn models with FastAPI
- **Real-Time Data Processing**: Learn to process and visualize streaming data
- **Full-Stack Architecture**: Modern React + Python + Database stack

---

## Technical Highlights

### Momentum Algorithm
- **20-Bucket Time Series**: Divides game into equal time segments
- **Weighted Scoring System**: Different point values for different play types
- **Rolling Cumulative Sum**: Captures momentum building over time
- **Normalization**: Ensures consistent -1 to +1 range across all games

### Machine Learning
- **Feature Engineering**: Sliding window approach for time series data
- **Binary Classification**: Run vs. no-run prediction
- **Cosine Similarity**: Vector-based similarity matching for game DNA
- **Model Persistence**: Trained models saved as `.pkl` files

### Data Pipeline
- **NBA API Integration**: Fetches real historical game data
- **Rate Limiting**: Respects API limits (0.6s between requests)
- **Idempotent Processing**: Skips already-processed games
- **Mock Data Support**: Works without database for demos

### Frontend Features
- **Real-Time Updates**: Polling-based live data refresh
- **Responsive Design**: Works on desktop and mobile
- **Interactive Charts**: Hover tooltips, zoom, and detailed play information
- **Error Handling**: Graceful fallbacks when APIs are unavailable

---

## Project Structure

```
momentum-shift/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── MomentumChart.tsx
│   │   ├── GameDNA.tsx
│   │   ├── Scoreboard.tsx
│   │   └── PlayByPlay.tsx
│   └── App.tsx            # Main application
│
├── backend/               # Python FastAPI backend
│   ├── main.py           # API endpoints
│   ├── ml/               # Machine learning
│   │   ├── predictor.py  # Run predictor
│   │   └── train_run_predictor.py
│   ├── pipeline/         # Data processing
│   │   ├── fetch_historical.py
│   │   └── seed_mock_data.py
│   └── schema.sql        # Database schema
│
├── server/                # Node.js proxy
│   ├── index.js          # Express server
│   └── momentumAlgorithm.js
│
├── SETUP.md              # Setup instructions
├── PROJECT_OVERVIEW.md   # This file
└── start.sh              # Startup script
```

---

## API Endpoints

### Backend (FastAPI) - Port 8000

- **GET `/health`**: Health check endpoint
- **GET `/api/similar-games`**: Find similar historical games
  - Query params: `momentum_vector` (20 floats), `top_k` (int)
  - Returns: List of similar games with similarity scores
- **POST `/api/predict-run`**: Predict if a momentum run is incoming
  - Body: `{momentum_window: [5 floats], score_diff: float}`
  - Returns: `{run_probability, confidence, message}`
- **GET `/api/player-impact/{player_name}`**: Get player momentum impact stats

### Proxy Server (Express) - Port 3001

- **GET `/api/games`**: Get list of games (live/recent)
- **GET `/api/game/:id`**: Get game data with momentum calculations

---

## Future Enhancements

Potential features that could be added:

1. **Player Impact Analysis**: Track individual player contributions to momentum
2. **Team-Specific Models**: Train separate models for each team
3. **Advanced ML Models**: Use LSTM or Transformer models for better predictions
4. **Multi-Game Dashboard**: Compare multiple games simultaneously
5. **Export Functionality**: Download momentum data as CSV/JSON
6. **Historical Trends**: Analyze momentum patterns across entire seasons
7. **Mobile App**: Native iOS/Android applications
8. **Real-Time WebSockets**: Replace polling with WebSocket connections

---

## Key Technologies

### Frontend
- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **Recharts**: Chart visualization
- **Axios**: HTTP client

### Backend
- **FastAPI**: Web framework
- **Python 3.10+**: Programming language
- **scikit-learn**: Machine learning
- **numpy/pandas**: Data processing
- **Supabase**: Database and client
- **nba_api**: NBA data source
- **joblib**: Model persistence

### Infrastructure
- **Supabase**: PostgreSQL database
- **ESPN API**: Live game data source
- **NBA API**: Historical data source

---

## Performance Characteristics

- **Real-Time Updates**: 15-second polling for live games
- **ML Predictions**: <100ms response time
- **Similarity Matching**: Handles thousands of historical games
- **Scalability**: Can process 50+ games in ~5 minutes
- **Rate Limiting**: Respects external API limits

---

## Getting Started

1. **Read SETUP.md**: Complete setup instructions
2. **Install Dependencies**: Node.js and Python packages
3. **Configure Supabase**: Set up database and credentials
4. **Seed Data**: Run mock data script
5. **Start Application**: Run `./start.sh`
6. **Open Browser**: Navigate to `http://localhost:5173`

For detailed setup instructions, see [SETUP.md](./SETUP.md).

---

## Summary

**Momentum Shift** transforms raw basketball play-by-play data into actionable insights about game momentum. By combining real-time data processing, machine learning, and historical pattern matching, it provides a unique perspective on basketball games that goes far beyond traditional statistics.

Whether you're a fan wanting to understand game flow, an analyst looking for predictive insights, or a developer learning modern full-stack ML integration, Momentum Shift offers a comprehensive platform for sports analytics.

---

**Built with ❤️ for basketball analytics enthusiasts**
