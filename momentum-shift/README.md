# Momentum Shift 🏀📊

**Intelligent NBA Game Momentum Analytics Platform**

Momentum Shift is a real-time sports analytics application that analyzes NBA game momentum using machine learning and historical pattern matching. It provides fans, analysts, and coaches with deeper insights into game flow beyond traditional statistics.

![Momentum Shift](https://img.shields.io/badge/React-19-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Python](https://img.shields.io/badge/Python-3.10+-blue)

---

## 🎯 What It Does

Momentum Shift transforms live NBA game data into actionable momentum insights:

- **📈 Real-Time Momentum Visualization**: See game momentum shifts as they happen
- **🧬 Game DNA Matching**: Find historical games with similar momentum patterns
- **⚡ Run Predictor**: ML-powered predictions of upcoming scoring runs
- **📝 Game Intelligence**: AI-generated narratives about game flow

---

## ✨ Key Features

### Real-Time Momentum Chart
- Dynamic visualization showing momentum shifts throughout the game
- Color-coded by team (green = home advantage, red = away advantage)
- Updates every 15 seconds during live games
- Interactive tooltips with play details

### Game DNA Pattern Matcher
- Compares current game momentum to thousands of historical games
- Shows top 3 most similar games with similarity scores
- Predicts potential outcomes based on historical patterns
- Uses advanced cosine similarity matching

### Live Run Predictor
- Machine learning model predicts momentum runs before they happen
- Real-time alerts when a scoring run is likely (>60% probability)
- Confidence levels (high/medium/low)
- Updates every 30 seconds

### Play-by-Play Feed
- Real-time feed of all game events
- Shows momentum impact of each play
- Color-coded by team
- Complete game history

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- A Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd momentum-shift
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up backend**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   # Create .env file in backend/ directory
   echo "SUPABASE_URL=your-url-here" > backend/.env
   echo "SUPABASE_KEY=your-key-here" >> backend/.env
   ```

5. **Set up database** (see [SETUP.md](./SETUP.md) for detailed instructions)
   - Create a Supabase project
   - Run the SQL schema from `backend/schema.sql`
   - Seed initial data: `python backend/pipeline/seed_mock_data.py`

6. **Start the application**
   ```bash
   ./start.sh
   ```

7. **Open your browser**
   - Navigate to `http://localhost:5173`

For detailed setup instructions, see [SETUP.md](./SETUP.md).

---

## 📚 Documentation

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)**: Comprehensive explanation of what Momentum Shift does, how it works, and its architecture
- **[SETUP.md](./SETUP.md)**: Complete step-by-step setup guide
- **[backend/README.md](./backend/README.md)**: Backend-specific documentation

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │──────│  FastAPI      │──────│  Supabase   │
│  Frontend   │      │   Backend     │      │  Database   │
│  (Port 5173)│      │  (Port 8000) │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │
       │              ┌──────────────┐
       └──────────────│ Node.js Proxy│
                      │  (Port 3001) │
                      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  ESPN API    │
                      │  NBA API     │
                      └──────────────┘
```

### Components

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Python FastAPI with scikit-learn ML models
- **Proxy**: Node.js Express server for ESPN API
- **Database**: Supabase (PostgreSQL) for historical data

---

## 🔧 Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts

### Backend
- FastAPI
- Python 3.10+
- scikit-learn
- numpy/pandas
- Supabase

### Infrastructure
- Supabase (PostgreSQL)
- ESPN API
- NBA API

---

## 📊 How Momentum Works

Momentum Shift calculates game momentum using a sophisticated algorithm:

1. **Play Analysis**: Processes every play in the game
2. **Scoring System**:
   - +3 for 3-pointers
   - +2 for 2-pointers
   - +1 for free throws
   - -2 for turnovers
   - +1.5 for fast breaks
3. **Time Bucketing**: Splits game into 20 equal segments
4. **Normalization**: Creates a -1 to +1 momentum vector
5. **Pattern Matching**: Compares to historical games

See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for detailed explanation.

---

## 🎮 Usage

### Viewing Live Games
1. Start the application with `./start.sh`
2. The app automatically finds live or recent games
3. Watch momentum shift in real-time on the chart
4. See Game DNA matches after 15+ plays
5. Watch for Run Predictor alerts (⚡ badge)

### Analyzing Historical Games
1. Use the Game Library selector (top right)
2. Choose any game from the list
3. View its complete momentum pattern
4. See similar historical games

---

## 🧪 API Endpoints

### Backend (FastAPI)

- `GET /health` - Health check
- `GET /api/similar-games` - Find similar historical games
- `POST /api/predict-run` - Predict momentum runs
- `GET /api/player-impact/{name}` - Player impact stats

### Proxy Server

- `GET /api/games` - List of games
- `GET /api/game/:id` - Game data with momentum

---

## 🤝 Contributing

This is a hackathon project, but contributions are welcome! Areas for improvement:

- Additional ML models
- More data sources
- Performance optimizations
- UI/UX enhancements
- Mobile app version

---

## 📝 License

This project was created for Hacklytics 2026.

---

## 🙏 Acknowledgments

- **ESPN API** for live game data
- **NBA API** for historical data
- **Supabase** for database hosting
- **scikit-learn** for machine learning tools

---

## 📖 Learn More

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)**: Deep dive into how everything works
- **[SETUP.md](./SETUP.md)**: Complete setup guide
- **[backend/README.md](./backend/README.md)**: Backend documentation

---

**Built with ❤️ for basketball analytics enthusiasts**

For questions or issues, please refer to the documentation or check the troubleshooting section in [SETUP.md](./SETUP.md).
