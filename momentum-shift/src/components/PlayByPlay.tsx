import React from 'react';

interface PlayType {
    sequenceNumber: string;
    clock: string;
    period: number;
    text: string;
    teamId: string;
    type?: string;
    rawImpact?: number;
}

interface PlayByPlayProps {
    plays: PlayType[];
    homeTeamColor?: string;
    awayTeamColor?: string;
}

const PlayByPlay: React.FC<PlayByPlayProps> = ({ plays }) => {
    // Take only the most recent plays and reverse them so newest is on top
    const recentPlays = [...plays].reverse().slice(0, 15);

    const getImpactColor = (impact: number | undefined) => {
        if (impact === undefined || impact === 0) return 'border-gray-600 bg-gray-800 text-gray-300';
        if (impact > 0) return 'border-green-500 bg-green-900/40 text-green-50';
        return 'border-red-500 bg-red-900/40 text-red-50';
    };

    if (!plays || plays.length === 0) {
        return (
            <div className="glass-panel p-4 rounded-lg shadow-xl bg-gray-900 h-full flex flex-col min-h-[500px]">
                <h3 className="text-lg font-bold mb-4 uppercase tracking-wider text-gray-400 border-b border-gray-700 pb-2 flex items-center">
                    <span className="w-1.5 h-5 bg-blue-500 mr-2 rounded"></span>
                    Game Feed Matrix
                </h3>
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    <p className="font-mono text-sm tracking-widest">AWAITING FEED</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-4 rounded-lg shadow-xl bg-gray-900 h-full flex flex-col max-h-[85vh] border border-gray-800/50">
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider text-gray-300 border-b border-gray-700 pb-2 flex justify-between items-center">
                <div className="flex items-center">
                    <span className="w-1.5 h-5 bg-blue-500 mr-2 rounded"></span>
                    Live Game Feed
                </div>
                <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-blue-400 font-mono border border-gray-700">{plays.length} PLAYS</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {recentPlays.map((play) => (
                    <div
                        key={play.sequenceNumber}
                        className={`p-3 rounded border-l-4 text-sm transition-all duration-300 hover:brightness-125 hover:translate-x-1 ${getImpactColor(play.rawImpact)}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs opacity-70 tracking-widest">Q{play.period} {play.clock}</span>
                            {play.type && <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 bg-black/20 px-1.5 py-0.5 rounded">{play.type}</span>}
                        </div>
                        <p className="font-medium leading-snug">{play.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayByPlay;
