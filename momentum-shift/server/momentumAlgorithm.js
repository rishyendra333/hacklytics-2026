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

    // The plays are usually chronologically ordered in ESPN API, but let's ensure it.
    // However, some past games might be ordered differently. We assume they are ordered
    // either oldest to newest or newest to oldest. We'll sort to be safe: newest last.
    const sortedPlays = [...plays].sort((a, b) => {
        return new Date(a.wallclock).getTime() - new Date(b.wallclock).getTime();
    });

    const lastPlayTime = sortedPlays.length > 0
        ? new Date(sortedPlays[sortedPlays.length - 1].wallclock)
        : new Date();

    for (const play of sortedPlays) {
        if (!play.wallclock || !play.team || !play.team.id) continue;

        const playTime = new Date(play.wallclock);
        const rawImpact = calculatePlayImpact(play);
        const decay = calculateTimeDecay(playTime, lastPlayTime, 5); // 5 minute window

        const finalImpact = rawImpact * decay;

        if (finalImpact > 0) {
            // Determine sign based on team
            if (play.team.id === homeTeamId) {
                // Home team positive play (or away turnover credited to home defense logic)
                currentMomentum += finalImpact;
            } else if (play.team.id === awayTeamId) {
                // Away team positive play
                currentMomentum -= finalImpact;
            }

            // Optional logic: if it's a turnover, the finalImpact is negative above, 
            // so adding it actually subtracts.
            // Wait, calculatePlayImpact returns negative for turnovers.
            // If home team turns over, rawImpact = -5. 
            // currentMomentum += -5 (lowers momentum for home) -> Correct.
        } else if (finalImpact < 0) {
            // Turnover or negative play
            if (play.team.id === homeTeamId) {
                currentMomentum += finalImpact; // home team turnover -> negative momentum shift
            } else if (play.team.id === awayTeamId) {
                currentMomentum -= finalImpact; // away team turnover -> -(-5) -> positive shift for home
            }
        }

        // Clamp momentum between -100 and 100
        currentMomentum = Math.max(-momentumMax, Math.min(momentumMax, currentMomentum));

        history.push({
            sequenceNumber: play.sequenceNumber,
            clock: play.clock?.displayValue,
            period: play.period?.number,
            text: play.text,
            teamId: play.team.id,
            homeScore: play.homeScore,
            awayScore: play.awayScore,
            momentum: parseFloat(currentMomentum.toFixed(2)),
            rawImpact: rawImpact,
            type: play.type?.text
        });
    }

    return history;
}

module.exports = {
    calculatePlayImpact,
    calculateTimeDecay,
    calculateMomentumSeries
};
