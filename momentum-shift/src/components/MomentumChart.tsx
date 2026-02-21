import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

export interface MomentumPoint {
    sequenceNumber: string;
    clock: string;
    period: number;
    text: string;
    teamId: string;
    homeScore: number;
    awayScore: number;
    momentum: number;
    rawImpact: number;
    type?: string;
}

interface MomentumChartProps {
    data: MomentumPoint[];
    homeTeamColor?: string;
    awayTeamColor?: string;
}

interface RunPrediction {
    run_probability: number;
    confidence: string;
    message: string;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as MomentumPoint;

        return (
            <div className="bg-gray-900 border border-gray-700 p-3 rounded-md shadow-2xl max-w-xs text-sm">
                <div className="flex justify-between items-center mb-2 text-gray-400 font-mono space-x-4 border-b border-gray-800 pb-1">
                    <span>Q{data.period}</span>
                    <span>{data.clock}</span>
                </div>
                <p className="text-gray-100 font-medium leading-tight mb-2">"{data.text}"</p>

                <div className="flex justify-between mt-2 pt-2 border-t border-gray-800">
                    <span className="text-gray-400">Impact</span>
                    <span className={`font-bold ${data.rawImpact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.rawImpact > 0 ? '+' : ''}{data.rawImpact}
                    </span>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-gray-400">Score</span>
                    <span className="font-mono text-gray-200">{data.homeScore} - {data.awayScore}</span>
                </div>
            </div>
        );
    }
    return null;
};

const MomentumChart: React.FC<MomentumChartProps> = ({
    data,
    homeTeamColor = "#10b981", // default positive green
    awayTeamColor = "#ef4444"  // default negative red
}) => {
    const [prediction, setPrediction] = useState<RunPrediction | null>(null);

    // Run Predictor Polling
    useEffect(() => {
        // Need enough data points to form a 5-bucket window
        if (!data || data.length < 10) return;

        const checkRunPrediction = async () => {
            try {
                // Approximate mapping: take the last 5 momentum values
                // In a real scenario, this involves bucketing the actual timeframe exactly as the pipeline does
                const recentPlays = data.slice(-5);
                const momentumWindow = recentPlays.map(p => p.momentum / 100); // Normalize generic -100 to +100 to backend's -1 to 1

                // Send a generic score diff for the MVP based on current momentum magnitude
                const scoreDiff = data[data.length - 1].momentum;

                const response = await axios.post('http://localhost:8000/api/predict-run', {
                    momentum_window: momentumWindow,
                    score_diff: scoreDiff
                });

                setPrediction(response.data);
            } catch (err) {
                console.error("Failed to fetch run prediction from ML backend", err);
            }
        };

        checkRunPrediction();
        const interval = setInterval(checkRunPrediction, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="glass-panel p-6 rounded-lg shadow-xl mb-6 h-[400px] flex items-center justify-center bg-gray-900 border border-gray-800/50">
                <div className="text-center text-gray-500 flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl mb-1 tracking-wide text-gray-300">Calculating Momentum Matrix</p>
                    <p className="text-xs uppercase tracking-widest opacity-60">Waiting for Data Stream</p>
                </div>
            </div>
        );
    }

    // To create a two-color area chart where above 0 is one color and below 0 is another,
    // recharts supports gradient with generic offset.

    // Calculate where zero crosses for the gradient
    const maxValue = Math.max(...data.map(d => d.momentum));
    const minValue = Math.min(...data.map(d => d.momentum));

    let zeroOffset = 0;
    if (maxValue <= 0) {
        zeroOffset = 0;
    } else if (minValue >= 0) {
        zeroOffset = 1;
    } else {
        zeroOffset = maxValue / (maxValue - minValue);
    }

    return (
        <div className="glass-panel p-6 rounded-lg shadow-xl mb-6 h-[450px] bg-gray-900 border border-gray-800/50 relative overflow-hidden">
            {/* Decorative Grid Overlay effect */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMUMxeiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] pointer-events-none opacity-50 mix-blend-overlay"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold tracking-widest text-gray-300 uppercase flex items-center">
                        <span className="w-1.5 h-6 bg-blue-500 mr-3 rounded-full"></span>
                        Game Momentum Index
                    </h2>

                    {/* Run Predictor Badge */}
                    {prediction && prediction.run_probability > 0.6 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                            <span className="text-xl">⚡</span>
                            <span className="text-green-400 font-bold text-sm whitespace-nowrap">
                                Run Incoming ({Math.round(prediction.run_probability * 100)}%)
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ backgroundColor: homeTeamColor }}></span>HOME ADVANTAGE</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" style={{ backgroundColor: awayTeamColor }}></span>AWAY ADVANTAGE</div>
                </div>
            </div>

            <div className="w-full h-full pb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={zeroOffset} stopColor={homeTeamColor} stopOpacity={0.8} />
                                <stop offset={zeroOffset} stopColor={awayTeamColor} stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} vertical={false} />
                        <XAxis
                            dataKey="sequenceNumber"
                            hide={true} // Hide standard X-axis numbers as sequence numbers aren't human-readable time
                        />
                        <YAxis
                            domain={[-100, 100]}
                            tickFormatter={(val) => val === 0 ? 'EVEN' : Math.abs(val).toString()}
                            stroke="#4B5563"
                            tick={{ fill: '#9CA3AF', fontSize: 12, fontFamily: 'monospace' }}
                            width={50}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" opacity={0.5} />
                        <Area
                            type="monotone"
                            dataKey="momentum"
                            stroke="none"
                            fill="url(#splitColor)"
                            activeDot={{ r: 6, fill: '#fff', strokeWidth: 0 }}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MomentumChart;
