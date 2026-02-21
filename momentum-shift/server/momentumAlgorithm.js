/**
 * Analyzes a play's text description to determine its base momentum value and any modifiers.
 * @param {Object} play - ESPN API play object
 * @returns {number} Momentum score impact of this play
 */
function calculatePlayImpact(play) {
    if (!play || !play.text || !play.type) return 0;

    const text = play.text.toLowerCase();
    const typeText = play.type.text ? play.type.text.toLowerCase() : '';
    let impact = 0;

    // 1. Base Score (Points scored * 2)
    if (play.scoringPlay) {
        impact += (play.scoreValue || 0) * 2;
    }

    // 2. Modifiers
    // Turnovers
    if (typeText.includes('turnover') || text.includes('turnover')) {
        // Find who committed it to subtract from their team's perspective
        impact -= 5;
    }

    // Fast Breaks
    if (typeText.includes('fast break') || text.includes('fast break')) {
        impact += 3;
    }

    // Dunks / Alley-oops
    if (typeText.includes('dunk') || text.includes('dunk') || text.includes('alley oop') || text.includes('alley-oop')) {
        impact += 2;
    }

    // And-1s (made basket + foul)
    if (text.includes('and 1') || text.includes('and-1') || (play.scoringPlay && play.scoreValue > 0 && text.includes('foul'))) {
        impact += 2;
    }

    // Blocks
    if (typeText.includes('block') || text.includes('block')) {
        impact += 4; // High momentum shift for the defending team
    }

    // Steals
    if (typeText.includes('steal') || text.includes('steal')) {
        impact += 4; // High momentum shift
    }

    return impact;
}

/**
 * Calculates a time decay multiplicator for a play.
 * Plays older than maxWindowMinutes have 0 impact.
 * @param {Date} playTime - The wallclock time of the play
 * @param {Date} currentTime - The current time (or last play time)
 * @param {number} maxWindowMinutes - How far back to consider plays (in minutes)
 * @returns {number} Decay multiplier (0.0 to 1.0)
 */
function calculateTimeDecay(playTime, currentTime, maxWindowMinutes = 5) {
    const diffMs = currentTime.getTime() - playTime.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes >= maxWindowMinutes || diffMinutes < 0) {
        return 0;
    }

    // Linear decay: 1.0 at diff=0, 0.0 at diff=maxWindowMinutes
    return 1 - (diffMinutes / maxWindowMinutes);
}

/**
 * Processes an array of ESPN API plays and calculates current momentum.
 * Positive score favors home team, negative favors away team.
 * @param {Array} plays - Array of play objects from summary.plays
 * @param {string} homeTeamId - ID of the home team
 * @param {string} awayTeamId - ID of the away team
 * @returns {Array} Array of historical data points for the chart
 */
function calculateMomentumSeries(plays, homeTeamId, awayTeamId) {
    if (!plays || plays.length === 0) return [];

    let currentMomentum = 0;
    const momentumMax = 100;
    const history = [];
    
    // Momentum decay factor - reduces impact of older plays gradually
    // For live games, we want recent plays to matter more
    // For completed games, we still want to show the full momentum flow
    const decayWindow = 10; // Number of plays to consider for decay (rolling window)

    // The plays are usually chronologically ordered in ESPN API, but let's ensure it.
    const sortedPlays = [...plays].sort((a, b) => {
        return new Date(a.wallclock).getTime() - new Date(b.wallclock).getTime();
    });

    for (let i = 0; i < sortedPlays.length; i++) {
        const play = sortedPlays[i];
        if (!play.wallclock || !play.team || !play.team.id) continue;

        const rawImpact = calculatePlayImpact(play);
        
        // Apply a rolling decay - only decay plays that are far back in the window
        // This allows momentum to build up properly while still favoring recent plays
        const playsBack = sortedPlays.length - i - 1;
        let decayMultiplier = 1.0;
        
        // For completed games or games with many plays, use a rolling average approach
        // Only apply decay if we're looking at plays far back in history
        if (playsBack > decayWindow) {
            // Gradual decay for very old plays
            decayMultiplier = Math.max(0.3, 1.0 - (playsBack - decayWindow) / (decayWindow * 2));
        }

        const finalImpact = rawImpact * decayMultiplier;

        // Apply impact based on team
        if (play.team.id === homeTeamId) {
            // Home team play
            currentMomentum += finalImpact;
        } else if (play.team.id === awayTeamId) {
            // Away team play - subtract from momentum (negative = away advantage)
            currentMomentum -= finalImpact;
        }

        // Clamp momentum between -momentumMax and +momentumMax
        currentMomentum = Math.max(-momentumMax, Math.min(momentumMax, currentMomentum));

        history.push({
            sequenceNumber: play.sequenceNumber || i.toString(),
            clock: play.clock?.displayValue || play.clock?.value || '',
            period: play.period?.number || 1,
            text: play.text || '',
            teamId: play.team.id,
            homeScore: play.homeScore || 0,
            awayScore: play.awayScore || 0,
            momentum: parseFloat(currentMomentum.toFixed(2)),
            rawImpact: rawImpact,
            type: play.type?.text || ''
        });
    }

    // Normalize the momentum series to ensure good visibility
    // If the range is too small, scale it up
    if (history.length > 0) {
        const momentums = history.map(h => h.momentum);
        const maxMomentum = Math.max(...momentums);
        const minMomentum = Math.min(...momentums);
        const range = maxMomentum - minMomentum;
        
        // If the range is very small (< 20), scale it up to make it more visible
        if (range > 0 && range < 20) {
            const scaleFactor = 20 / range;
            history.forEach(h => {
                h.momentum = Math.max(-momentumMax, Math.min(momentumMax, h.momentum * scaleFactor));
            });
        }
    }

    return history;
}

module.exports = {
    calculatePlayImpact,
    calculateTimeDecay,
    calculateMomentumSeries
};
