import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ComposedChart
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
    onTimePeriodSelect?: (startIndex: number, endIndex: number) => void;
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
                    <span className="text-gray-400">Momentum</span>
                    <span className={`font-bold text-lg ${data.momentum > 0 ? 'text-green-400' : data.momentum < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {data.momentum > 0 ? '+' : ''}{data.momentum.toFixed(1)}
                    </span>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-gray-400">Play Impact</span>
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
    awayTeamColor = "#ef4444",  // default negative red
    onTimePeriodSelect
}) => {
    const [prediction, setPrediction] = useState<RunPrediction | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

    // Filter out any invalid data points and ensure momentum is a number
    const validData = data
        .map((d, idx) => ({ ...d, index: idx }))
        .filter(d => d.momentum !== undefined && d.momentum !== null && !isNaN(d.momentum));
    
    if (validData.length === 0) {
        return (
            <div className="glass-panel p-6 rounded-lg shadow-xl mb-6 h-[400px] flex items-center justify-center bg-gray-900 border border-gray-800/50">
                <div className="text-center text-gray-500">
                    <p>No valid momentum data available</p>
                </div>
            </div>
        );
    }

    // To create a two-color area chart where above 0 is one color and below 0 is another,
    // recharts supports gradient with generic offset.

    // Calculate where zero crosses for the gradient
    const momentums = validData.map(d => d.momentum);
    const maxValue = Math.max(...momentums);
    const minValue = Math.min(...momentums);
    const range = maxValue - minValue;
    
    // Ensure the domain is always visible and meaningful
    // Use symmetric domain centered at 0
    const absMax = Math.max(Math.abs(maxValue), Math.abs(minValue));
    
    // If values are very small, use a minimum range
    // Otherwise, add 15% padding to the actual range
    let domainMax, domainMin;
    
    if (absMax < 5) {
        // Very small values - use a fixed small range
        domainMax = 10;
        domainMin = -10;
    } else if (absMax < 20) {
        // Small range - ensure at least 20 units visible
        domainMax = Math.max(absMax * 1.3, 20);
        domainMin = -domainMax;
    } else {
        // Normal range - add padding
        domainMax = absMax * 1.15;
        domainMin = -domainMax;
    }
    
    // Never exceed the theoretical max
    domainMax = Math.min(domainMax, 100);
    domainMin = Math.max(domainMin, -100);

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
                {onTimePeriodSelect && (
                    <div className="text-xs text-gray-400 mb-2 text-center italic">
                        💡 Hover over the chart and click on a data point to analyze that time period
                        {selectedIndex !== null && ` • Selected: Play #${selectedIndex + 1}`}
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={validData}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 20,
                        }}
                    >
                        <defs>
                            <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={homeTeamColor} stopOpacity={0.6} />
                                <stop offset="100%" stopColor={homeTeamColor} stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="negativeGradient" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor={awayTeamColor} stopOpacity={0.6} />
                                <stop offset="100%" stopColor={awayTeamColor} stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} vertical={false} />
                        <XAxis
                            dataKey="index"
                            type="number"
                            scale="linear"
                            domain={[0, validData.length - 1]}
                            tick={false}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'Game Progress', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF', fontSize: 11 } }}
                        />
                        <YAxis
                            domain={[domainMin, domainMax]}
                            tickFormatter={(val) => {
                                if (val === 0) return 'EVEN';
                                const absVal = Math.abs(val);
                                return absVal >= 1 ? absVal.toFixed(0) : absVal.toFixed(1);
                            }}
                            stroke="#4B5563"
                            tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'monospace' }}
                            width={60}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'Momentum', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: 11 } }}
                        />
                        <Tooltip 
                            content={(props: any) => {
                                // Make tooltip clickable
                                const handleClick = () => {
                                    if (onTimePeriodSelect && props && props.active && props.payload && props.payload[0] && props.payload[0].payload) {
                                        const clickedIndex = props.payload[0].payload.index;
                                        // Select a window around the clicked point (20 plays total)
                                        const windowSize = 20;
                                        const startIndex = Math.max(0, clickedIndex - Math.floor(windowSize / 2));
                                        const endIndex = Math.min(validData.length - 1, clickedIndex + Math.floor(windowSize / 2));
                                        setSelectedIndex(clickedIndex);
                                        onTimePeriodSelect(startIndex, endIndex);
                                    }
                                };
                                return (
                                    <div onClick={handleClick} style={{ cursor: 'pointer' }}>
                                        <CustomTooltip {...props} />
                                    </div>
                                );
                            }}
                            cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2, strokeDasharray: '4 4' }}
                        />
                        <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} strokeDasharray="3 3" opacity={0.6} />
                        {/* Area for positive momentum (above zero line) */}
                        <Area
                            type="monotone"
                            dataKey={(entry: any) => entry.momentum > 0 ? entry.momentum : 0}
                            stroke="none"
                            fill="url(#positiveGradient)"
                            fillOpacity={1}
                            baseLine={0}
                            connectNulls={true}
                        />
                        {/* Area for negative momentum (below zero line) */}
                        <Area
                            type="monotone"
                            dataKey={(entry: any) => entry.momentum < 0 ? entry.momentum : 0}
                            stroke="none"
                            fill="url(#negativeGradient)"
                            fillOpacity={1}
                            baseLine={0}
                            connectNulls={true}
                        />
                        {/* Line on top for visibility - use a neutral color that works for both */}
                        <Line
                            type="monotone"
                            dataKey="momentum"
                            stroke="#ffffff"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ 
                                r: 7, 
                                fill: '#fff', 
                                strokeWidth: 3,
                                stroke: '#3b82f6'
                            }}
                            animationDuration={1500}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MomentumChart;
