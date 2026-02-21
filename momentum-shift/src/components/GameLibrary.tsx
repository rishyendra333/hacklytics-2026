import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface GameLibraryProps {
    onSelectGame: (gameId: string) => void;
    activeGameId: string | null;
}

const GameLibrary: React.FC<GameLibraryProps> = ({ onSelectGame, activeGameId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchLibraryGames = async () => {
            setLoading(true);
            try {
                // Fetch today's games
                const todayRes = await axios.get('http://localhost:3001/api/games');
                let events = todayRes.data?.events || [];

                // If no games today, fetch yesterday's games
                if (events.length === 0) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yyyymmdd = yesterday.toISOString().split('T')[0].replace(/-/g, '');
                    const yesterdayRes = await axios.get(`http://localhost:3001/api/games?date=${yyyymmdd}`);
                    events = yesterdayRes.data?.events || [];
                }

                setGames(events);
            } catch (err) {
                console.error("Failed to fetch game library", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLibraryGames();
    }, [isOpen]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-md border border-gray-600 flex items-center gap-2 transition-colors text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Game Library
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-start pt-20 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl relative mb-20 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                                NBA Game Library
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {loading ? (
                                <div className="text-center py-10 text-gray-500">Loading games...</div>
                            ) : games.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">No recent games found.</div>
                            ) : (
                                games.map((game) => {
                                    const state = game.status.type.state;
                                    const isLive = state === 'in';
                                    const isFinal = state === 'post';
                                    const isScheduled = state === 'pre';

                                    const hTeam = game.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home');
                                    const aTeam = game.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away');

                                    const detail = game.status.type.detail;

                                    return (
                                        <div
                                            key={game.id}
                                            onClick={() => {
                                                if (!isScheduled) {
                                                    onSelectGame(game.id);
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`p-4 rounded-lg border flex items-center justify-between transition-colors
                                                ${activeGameId === game.id ? 'bg-blue-900/40 border-blue-500' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}
                                                ${isScheduled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                            `}
                                        >
                                            <div className="flex items-center gap-6 flex-1">
                                                {/* Away */}
                                                <div className="flex items-center gap-2 flex-1 justify-end">
                                                    <span className="font-bold hidden sm:inline">{aTeam?.team?.name}</span>
                                                    <span className="font-bold sm:hidden">{aTeam?.team?.abbreviation}</span>
                                                    <img src={aTeam?.team?.logo} alt="away logo" className="w-8 h-8 object-contain bg-white rounded-full p-1" />
                                                    {(!isScheduled) && <span className="text-xl font-mono ml-2">{aTeam?.score}</span>}
                                                </div>

                                                <div className="text-gray-500 font-mono text-sm px-2">@</div>

                                                {/* Home */}
                                                <div className="flex items-center gap-2 flex-1 justify-start">
                                                    {(!isScheduled) && <span className="text-xl font-mono mr-2">{hTeam?.score}</span>}
                                                    <img src={hTeam?.team?.logo} alt="home logo" className="w-8 h-8 object-contain bg-white rounded-full p-1" />
                                                    <span className="font-bold hidden sm:inline">{hTeam?.team?.name}</span>
                                                    <span className="font-bold sm:hidden">{hTeam?.team?.abbreviation}</span>
                                                </div>
                                            </div>

                                            <div className="w-24 flex justify-end">
                                                {isLive && <span className="text-red-500 text-xs font-bold border border-red-500 bg-red-500/10 px-2 py-1 rounded">LIVE</span>}
                                                {isFinal && <span className="text-gray-400 text-xs font-bold border border-gray-600 bg-gray-800 rounded px-2 py-1">FINAL</span>}
                                                {isScheduled && <span className="text-blue-400 text-xs text-right leading-tight max-w-[80px] truncate">{detail}</span>}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GameLibrary;