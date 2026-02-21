import React from 'react';

// Interfaces for the expected props based on ESPN API
interface TeamProps {
    id: string;
    name: string;
    abbreviation: string;
    logo: string;
    score: string;
    color: string;
}

interface ScoreboardProps {
    homeTeam: TeamProps | null;
    awayTeam: TeamProps | null;
    clock: string;
    period: number;
    isLive: boolean;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ homeTeam, awayTeam, clock, period, isLive }) => {
    if (!homeTeam || !awayTeam) {
        return (
            <header className="glass-panel p-4 mb-6 flex justify-between items-center bg-gray-900 rounded-lg shadow-xl h-24">
                <div className="animate-pulse flex space-x-4 w-full">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-700 rounded"></div>
                        </div>
                    </div>
                </div>
            </header>
        )
    }

    const formatPeriod = (p: number) => {
        if (!p) return 'Q1'; // fallback
        if (p > 4) return `OT${p - 4}`;
        return `Q${p}`;
    };

    return (
        <header className="glass-panel p-4 mb-6 flex justify-between items-center bg-gray-900 rounded-lg shadow-xl border-t-4 border-t-blue-500">
            {/* Away Team */}
            <div className="flex items-center gap-4">
                {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="w-12 h-12 object-contain" />}
                <div className="flex flex-col">
                    <span className="text-gray-400 text-sm font-bold tracking-wider">{awayTeam.abbreviation}</span>
                    <span className="text-xl font-bold">{awayTeam.name}</span>
                </div>
                <div className="text-5xl font-black ml-4 font-mono">{awayTeam.score}</div>
            </div>

            {/* Game Clock / Status */}
            <div className="flex flex-col items-center justify-center min-w-[150px]">
                {isLive ? (
                    <div className="text-red-500 font-bold flex items-center gap-2 mb-1 px-3 py-1 bg-red-950/30 rounded-full border border-red-900/50">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 live-indicator shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                        LIVE
                    </div>
                ) : (
                    <div className="text-gray-400 font-bold mb-1 tracking-widest text-sm bg-gray-800 px-3 py-1 rounded">
                        FINAL
                    </div>
                )}
                <div className="text-2xl font-mono px-4 py-1 rounded bg-black/40 border border-gray-800 shadow-inner">
                    <span className="text-blue-400 mr-2">{formatPeriod(period)}</span>
                    {clock || '0:00'}
                </div>
            </div>

            {/* Home Team */}
            <div className="flex items-center gap-4">
                <div className="text-5xl font-black mr-4 font-mono">{homeTeam.score}</div>
                <div className="flex flex-col items-end">
                    <span className="text-gray-400 text-sm font-bold tracking-wider">{homeTeam.abbreviation}</span>
                    <span className="text-xl font-bold">{homeTeam.name}</span>
                </div>
                {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="w-12 h-12 object-contain" />}
            </div>
        </header>
    );
};

export default Scoreboard;
