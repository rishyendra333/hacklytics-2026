import { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';
import Scoreboard from './components/Scoreboard';
import MomentumChart from './components/MomentumChart';
import PlayByPlay from './components/PlayByPlay';
import GameLibrary from './components/GameLibrary';
import GameDNA from './components/GameDNA';

// Fallback game: Celtics vs Hornets (for when no live/recent games are suitable)
const DEFAULT_GAME_ID = '401585715';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Game State
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [clock, setClock] = useState<string>('');
  const [period, setPeriod] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);

  // Momentum & Plays State
  const [momentumData, setMomentumData] = useState<any[]>([]);
  const [recentPlays, setRecentPlays] = useState<any[]>([]);
  const [gameStory, setGameStory] = useState<string>("Analyzing game flow...");
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<{start: number, end: number} | null>(null);

  // 1. Initial Data Fetch: Find the best game to display
  useEffect(() => {
    const fetchGameList = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/games');
        const events = response.data?.events || [];

        // Priority 1: Find a live game
        const liveGame = events.find((e: any) => e.status.type.state === 'in');
        if (liveGame) {
          setActiveGameId(liveGame.id);
          return;
        }

        // Priority 2: Find a recently completed game
        const completedGame = events.find((e: any) => e.status.type.state === 'post');
        if (completedGame) {
          setActiveGameId(completedGame.id);
          return;
        }

        // Priority 3: No live/completed games, use fallback
        console.log("No live or completed games found for today. Using fallback Replay Mode.");
        setActiveGameId(DEFAULT_GAME_ID);

      } catch (err) {
        console.error("Failed to fetch game list", err);
        setActiveGameId(DEFAULT_GAME_ID);
      }
    };

    fetchGameList();
  }, []);

  // 2. Poll data for the active game
  useEffect(() => {
    if (!activeGameId) return; // Wait until a game is selected

    const fetchGameData = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/game/${activeGameId}`);
        const data = response.data;

        // Extract Scoreboard Info
        const header = data.summary.header;

        if (header && header.competitions && header.competitions[0]) {
          const comp = header.competitions[0];
          setIsLive(comp.status.type.state === 'in');
          setClock(comp.status.displayClock);
          setPeriod(comp.status.period);

          const home = comp.competitors.find((c: any) => c.homeAway === 'home');
          const away = comp.competitors.find((c: any) => c.homeAway === 'away');

          if (home && away) {
            setHomeTeam({
              id: home.id,
              name: home.team.name,
              abbreviation: home.team.abbreviation,
              logo: home.team.logos?.[0]?.href,
              score: home.score,
              color: home.team.color ? `#${home.team.color}` : '#10b981'
            });

            setAwayTeam({
              id: away.id,
              name: away.team.name,
              abbreviation: away.team.abbreviation,
              logo: away.team.logos?.[0]?.href,
              score: away.score,
              color: away.team.color ? `#${away.team.color}` : '#ef4444'
            });
          }
        }

        // Apply Momentum Data
        if (data.momentum) {
          setMomentumData(data.momentum);

          // Generate a very basic narrative based on the last few plays
          const lastPlays = data.momentum.slice(-5);
          const recentMomentumChange = lastPlays.length > 0
            ? lastPlays[lastPlays.length - 1].momentum - (lastPlays[0]?.momentum || 0)
            : 0;

          if (recentMomentumChange > 10) {
            setGameStory(`The ${homeTeam?.name || 'home team'} is building significant momentum right now with a flurry of positive plays.`);
          } else if (recentMomentumChange < -10) {
            setGameStory(`The ${awayTeam?.name || 'away team'} has seized control recently, quieting the crowd.`);
          } else {
            setGameStory("The game flow is currently balanced with neither team establishing a clear sustained advantage over the last few minutes.");
          }
        }

        if (data.playByPlay) {
          // Create the plays array matching our momentum data structure
          // The API plays are in summary.plays, we mapped them in the backend but we need them for the feed
          const playsWithImpact = data.momentum.map((m: any) => ({
            sequenceNumber: m.sequenceNumber,
            clock: m.clock,
            period: m.period,
            text: m.text,
            teamId: m.teamId,
            type: m.type,
            rawImpact: m.rawImpact
          }));
          setRecentPlays(playsWithImpact);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch game data", err);
        setError("Unable to connect to intelligence server.");
        setLoading(false);
      }
    };

    fetchGameData();
    // Poll every 15 seconds
    const interval = setInterval(fetchGameData, 15000);
    return () => clearInterval(interval);
  }, [activeGameId]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-500 p-6 flex justify-center items-center h-full">
        <div className="glass-panel p-8 text-center bg-gray-900 rounded-lg shadow-xl border border-red-900">
          <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            System Error
          </h2>
          <p className="text-lg text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 flex flex-col items-center">

      {/* Top Header Navigation */}
      <div className="max-w-[1400px] w-full flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white shadow-sm">
            MOMENTUM<span className="text-blue-500">SHIFT</span>
          </h1>
        </div>

        <GameLibrary
          activeGameId={activeGameId}
          onSelectGame={(id) => {
            setActiveGameId(id);
            setLoading(true);
          }}
        />
      </div>

      <div className="max-w-[1400px] w-full grid grid-cols-12 gap-6">

        {/* Main Content Area */}
        <div className="col-span-12 lg:col-span-8 flex flex-col">
          <Scoreboard
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            clock={clock}
            period={period}
            isLive={isLive}
          />

          <MomentumChart
            data={momentumData}
            homeTeamColor={homeTeam?.color}
            awayTeamColor={awayTeam?.color}
            onTimePeriodSelect={(startIndex, endIndex) => {
              setSelectedTimeWindow({start: startIndex, end: endIndex});
              
              // Update narrative based on selected time period
              const selectedPlays = momentumData.slice(startIndex, endIndex + 1);
              if (selectedPlays.length > 0) {
                const momentumChange = selectedPlays[selectedPlays.length - 1].momentum - (selectedPlays[0]?.momentum || 0);
                const avgMomentum = selectedPlays.reduce((sum, p) => sum + p.momentum, 0) / selectedPlays.length;
                const startTime = selectedPlays[0]?.clock || 'N/A';
                const endTime = selectedPlays[selectedPlays.length - 1]?.clock || 'N/A';
                
                if (momentumChange > 15) {
                  setGameStory(`From ${startTime} to ${endTime}: The ${homeTeam?.name || 'home team'} built strong momentum during this period, with an average momentum of ${avgMomentum.toFixed(1)}.`);
                } else if (momentumChange < -15) {
                  setGameStory(`From ${startTime} to ${endTime}: The ${awayTeam?.name || 'away team'} dominated this stretch, with an average momentum of ${avgMomentum.toFixed(1)}.`);
                } else if (avgMomentum > 10) {
                  setGameStory(`From ${startTime} to ${endTime}: The ${homeTeam?.name || 'home team'} maintained control during this period with an average momentum of ${avgMomentum.toFixed(1)}.`);
                } else if (avgMomentum < -10) {
                  setGameStory(`From ${startTime} to ${endTime}: The ${awayTeam?.name || 'away team'} held the advantage during this stretch with an average momentum of ${avgMomentum.toFixed(1)}.`);
                } else {
                  setGameStory(`From ${startTime} to ${endTime}: This was a balanced period with an average momentum of ${avgMomentum.toFixed(1)}. Neither team gained a significant advantage.`);
                }
              }
            }}
          />

          {/* Narrative Area below chart */}
          <div className="glass-panel p-6 rounded-lg shadow-xl bg-gray-900 mt-auto border border-gray-800/50">
            <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2 tracking-wide uppercase text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Game Intelligence Narrative
            </h3>
            {loading ? (
              <div className="animate-pulse h-4 bg-gray-800 rounded w-3/4 mt-3"></div>
            ) : (
              <p className="text-gray-300 leading-relaxed text-lg">
                {gameStory}
              </p>
            )}
          </div>

          {/* Game DNA Analysis Component */}
          <GameDNA data={momentumData} selectedTimeWindow={selectedTimeWindow} />
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 h-[calc(100vh-3rem)]">
          <PlayByPlay plays={recentPlays} />
        </div>

      </div>
    </div>
  );
}

export default App;
