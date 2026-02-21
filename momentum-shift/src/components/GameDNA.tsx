import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { MomentumPoint } from './MomentumChart';

interface GameDNAProps {
    data: MomentumPoint[];
    selectedTimeWindow?: {start: number, end: number} | null;
}

interface SimilarGame {
    game_id: string;
    home_team: string;
    away_team: string;
    final_score: string;
    season: string;
    similarity_score: number;
}

interface DNAData {
    using_mock_data: boolean;
    results: SimilarGame[];
}

const GameDNA: React.FC<GameDNAProps> = ({ data, selectedTimeWindow }) => {
    const [dnaResults, setDnaResults] = useState<DNAData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Need at least 15 plays to form a meaningful 20-point vector
        if (!data || data.length < 15) {
            setDnaResults(null);
            return;
        }

        const fetchGameDNA = async () => {
            setLoading(true);
            try {
                // Use selected time window if available, otherwise use all data
                const dataToUse = selectedTimeWindow 
                    ? data.slice(selectedTimeWindow.start, selectedTimeWindow.end + 1)
                    : data;

                // To query the backend, we need exactly 20 floats.
                // Normalize momentum values to -1 to 1 range (divide by 100)
                let vector = dataToUse.map(p => {
                    // Normalize: momentum is in -100 to 100 range, convert to -1 to 1
                    return Math.max(-1, Math.min(1, p.momentum / 100));
                });
                if (vector.length > 20) {
                    // Quick downsample taking evenly spaced points
                    const step = vector.length / 20;
                    const downsampled = [];
                    for (let i = 0; i < 20; i++) {
                        downsampled.push(vector[Math.floor(i * step)]);
                    }
                    vector = downsampled;
                } else if (vector.length < 20) {
                    // Pad with the last value
                    const lastVal = vector[vector.length - 1];
                    while (vector.length < 20) {
                        vector.push(lastVal);
                    }
                }

                const vectorStr = vector.map(v => v.toFixed(3)).join(',');

                const response = await axios.get(`http://localhost:8000/api/similar-games?momentum_vector=${vectorStr}&top_k=3`);
                setDnaResults(response.data);
            } catch (err) {
                console.error("Failed to fetch Game DNA", err);
            } finally {
                setLoading(false);
            }
        };

        // Fetch when data changes or time window is selected
        fetchGameDNA();
    }, [data.length, selectedTimeWindow?.start, selectedTimeWindow?.end]); // Re-fetch when time window changes

    if (!data || data.length < 15) {
        return null; // Don't show the card until we have enough data
    }

    return (
        <div className="mt-6 mb-6">
            <h3 className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4 flex items-center justify-between">
                <span>🧬 Game DNA Analysis</span>
                <div className="flex gap-2 items-center">
                    {selectedTimeWindow && (
                        <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50">
                            Time Period Selected
                        </span>
                    )}
                    {dnaResults?.using_mock_data && (
                        <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded border border-gray-700">Sample Data</span>
                    )}
                </div>
            </h3>

            {loading ? (
                <div className="flex justify-center p-4">
                    <span className="text-gray-500 animate-pulse text-sm">Sequencing match momentum...</span>
                </div>
            ) : dnaResults && dnaResults.results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {dnaResults.results.map((match, idx) => (
                        <div key={idx} className="glass-panel bg-gray-900 border border-gray-800 p-4 rounded-lg flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-gray-500 font-mono tracking-wider">{match.season}</span>
                                <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded bg-opacity-50 border border-blue-800/50">
                                    {(match.similarity_score * 100).toFixed(1)}% Match
                                </span>
                            </div>
                            <div className="text-center my-3">
                                <div className="text-lg font-black text-gray-200">
                                    {match.home_team} <span className="text-gray-600 font-normal mx-1">vs</span> {match.away_team}
                                </div>
                            </div>
                            <div className="flex justify-between items-end border-t border-gray-800 pt-3 mt-1">
                                <span className="text-xs text-gray-500">Final Score</span>
                                <span className="font-mono text-sm text-gray-300 bg-black/40 px-2 py-0.5 rounded border border-gray-800">{match.final_score}</span>
                            </div>
                            <div className="absolute top-0 right-0 -mr-2 -mt-2">
                                {/* Subtle indicator */}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-sm text-gray-500 p-4 bg-gray-900 rounded border border-gray-800 text-center">
                    No historical matches found for this momentum pattern.
                </div>
            )}
            {dnaResults && !loading && (
                <p className="text-center text-xs text-gray-500 mt-4 italic">"This game is playing out like..."</p>
            )}
        </div>
    );
};

export default GameDNA;
