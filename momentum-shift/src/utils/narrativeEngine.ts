interface MomentumPoint {
  sequenceNumber: string;
  clock: string;
  period: number;
  text: string;
  teamId: string;
  homeScore: number;
  awayScore: number;
  momentum: number;
  rawImpact: number;
  type: string;
}

interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  score: string;
}

interface NarrativeInput {
  momentumData: MomentumPoint[];
  homeTeam: TeamInfo | null;
  awayTeam: TeamInfo | null;
  period: number;
  clock: string;
  isLive: boolean;
}

interface TimeWindowInput {
  momentumData: MomentumPoint[];
  fullData: MomentumPoint[];
  homeTeam: TeamInfo | null;
  awayTeam: TeamInfo | null;
  start: number;
  end: number;
}

function getQuarterLabel(period: number): string {
  if (period <= 4) return `Q${period}`;
  return `OT${period - 4}`;
}

function getTeamForPlay(play: MomentumPoint, homeTeam: TeamInfo | null, awayTeam: TeamInfo | null): string {
  if (!homeTeam || !awayTeam) return 'A team';
  return play.teamId === homeTeam.id ? homeTeam.name : awayTeam.name;
}

function detectScoringRuns(data: MomentumPoint[], homeTeam: TeamInfo | null, awayTeam: TeamInfo | null): string | null {
  if (data.length < 8) return null;

  const recent = data.slice(-15);
  let homeRun = 0;
  let awayRun = 0;
  let homeRunStart = -1;
  let awayRunStart = -1;

  // Track consecutive scoring for each team
  for (let i = 0; i < recent.length; i++) {
    const play = recent[i];
    if (play.rawImpact > 0 && homeTeam && play.teamId === homeTeam.id) {
      if (homeRunStart === -1) homeRunStart = i;
      homeRun++;
      awayRun = 0;
      awayRunStart = -1;
    } else if (play.rawImpact > 0 && awayTeam && play.teamId === awayTeam.id) {
      if (awayRunStart === -1) awayRunStart = i;
      awayRun++;
      homeRun = 0;
      homeRunStart = -1;
    }
  }

  // Check for significant scoring streaks in recent plays
  const last10 = data.slice(-10);
  const homeScoringPlays = last10.filter(p => p.rawImpact > 2 && homeTeam && p.teamId === homeTeam.id).length;
  const awayScoringPlays = last10.filter(p => p.rawImpact > 2 && awayTeam && p.teamId === awayTeam.id).length;

  if (homeScoringPlays >= 4 && homeScoringPlays > awayScoringPlays * 2) {
    return `${homeTeam?.name || 'The home team'} is on a scoring run, converting ${homeScoringPlays} of the last 10 possessions into baskets.`;
  }
  if (awayScoringPlays >= 4 && awayScoringPlays > homeScoringPlays * 2) {
    return `${awayTeam?.name || 'The away team'} is on a scoring run, converting ${awayScoringPlays} of the last 10 possessions into baskets.`;
  }

  return null;
}

function detectLeadChanges(data: MomentumPoint[]): number {
  let changes = 0;
  let lastLeader: 'home' | 'away' | 'tied' = 'tied';

  for (const play of data) {
    const homePts = Number(play.homeScore) || 0;
    const awayPts = Number(play.awayScore) || 0;
    let current: 'home' | 'away' | 'tied';

    if (homePts > awayPts) current = 'home';
    else if (awayPts > homePts) current = 'away';
    else current = 'tied';

    if (current !== 'tied' && lastLeader !== 'tied' && current !== lastLeader) {
      changes++;
    }
    if (current !== 'tied') lastLeader = current;
  }

  return changes;
}

function detectMomentumTrend(data: MomentumPoint[]): { direction: 'home' | 'away' | 'neutral'; strength: 'strong' | 'moderate' | 'slight'; volatility: 'volatile' | 'stable' | 'building' } {
  if (data.length < 5) return { direction: 'neutral', strength: 'slight', volatility: 'stable' };

  const recent = data.slice(-10);
  const momentums = recent.map(p => p.momentum);

  // Direction: average of recent momentum
  const avg = momentums.reduce((s, v) => s + v, 0) / momentums.length;
  const direction = avg > 8 ? 'home' : avg < -8 ? 'away' : 'neutral';

  // Strength: magnitude of average
  const absAvg = Math.abs(avg);
  const strength = absAvg > 30 ? 'strong' : absAvg > 12 ? 'moderate' : 'slight';

  // Volatility: standard deviation of changes
  const changes: number[] = [];
  for (let i = 1; i < momentums.length; i++) {
    changes.push(Math.abs(momentums[i] - momentums[i - 1]));
  }
  const avgChange = changes.length > 0 ? changes.reduce((s, v) => s + v, 0) / changes.length : 0;

  // Check if momentum is consistently building in one direction
  const isBuilding = momentums.length >= 5 &&
    ((momentums[momentums.length - 1] > momentums[momentums.length - 3] &&
      momentums[momentums.length - 3] > momentums[0]) ||
     (momentums[momentums.length - 1] < momentums[momentums.length - 3] &&
      momentums[momentums.length - 3] < momentums[0]));

  const volatility = isBuilding ? 'building' : avgChange > 15 ? 'volatile' : 'stable';

  return { direction, strength, volatility };
}

function findBiggestSwing(data: MomentumPoint[]): { play: MomentumPoint; swingAmount: number } | null {
  if (data.length < 3) return null;

  let biggestSwing = 0;
  let swingPlay: MomentumPoint | null = null;

  for (let i = 1; i < data.length; i++) {
    const swing = Math.abs(data[i].momentum - data[i - 1].momentum);
    if (swing > biggestSwing && data[i].rawImpact !== 0) {
      biggestSwing = swing;
      swingPlay = data[i];
    }
  }

  if (swingPlay && biggestSwing > 5) {
    return { play: swingPlay, swingAmount: biggestSwing };
  }
  return null;
}

function findKeyPlays(data: MomentumPoint[], homeTeam: TeamInfo | null, awayTeam: TeamInfo | null): string | null {
  const recent = data.slice(-20);
  const highImpactPlays = recent
    .filter(p => Math.abs(p.rawImpact) >= 6)
    .slice(-3);

  if (highImpactPlays.length === 0) return null;

  const descriptions: string[] = [];
  for (const play of highImpactPlays) {
    const team = getTeamForPlay(play, homeTeam, awayTeam);
    const type = play.type.toLowerCase();

    if (type.includes('block') || play.text.toLowerCase().includes('block')) {
      descriptions.push(`a ${team} block`);
    } else if (type.includes('steal') || play.text.toLowerCase().includes('steal')) {
      descriptions.push(`a ${team} steal`);
    } else if (type.includes('dunk') || play.text.toLowerCase().includes('dunk')) {
      descriptions.push(`a ${team} dunk`);
    } else if (play.text.toLowerCase().includes('three point') || play.text.toLowerCase().includes('3pt')) {
      descriptions.push(`a ${team} three-pointer`);
    } else if (Math.abs(play.rawImpact) >= 8) {
      descriptions.push(`a big ${team} play`);
    }
  }

  if (descriptions.length === 0) return null;
  if (descriptions.length === 1) return `Key play: ${descriptions[0]}.`;
  return `Key plays: ${descriptions.slice(0, -1).join(', ')} and ${descriptions[descriptions.length - 1]}.`;
}

function getGameSituation(data: MomentumPoint[], period: number, clock: string, homeTeam: TeamInfo | null, awayTeam: TeamInfo | null): string | null {
  if (data.length === 0 || !homeTeam || !awayTeam) return null;

  const latest = data[data.length - 1];
  const homeScore = Number(latest.homeScore) || Number(homeTeam.score) || 0;
  const awayScore = Number(latest.awayScore) || Number(awayTeam.score) || 0;
  const diff = homeScore - awayScore;
  const absDiff = Math.abs(diff);
  const leader = diff > 0 ? homeTeam.name : awayTeam.name;
  const trailer = diff > 0 ? awayTeam.name : homeTeam.name;

  // Late game situations
  if (period >= 4) {
    const clockParts = clock.split(':');
    const minutes = parseInt(clockParts[0]) || 0;

    if (minutes <= 3 && absDiff <= 5) {
      return `Crunch time: ${leader} leads by ${absDiff} with ${clock} remaining in ${getQuarterLabel(period)}. Every possession matters.`;
    }
    if (minutes <= 5 && absDiff <= 10) {
      return `${leader} holds a ${absDiff}-point lead with ${clock} left in ${getQuarterLabel(period)}.`;
    }
  }

  // Blowout detection
  if (absDiff >= 25) {
    return `${leader} has built a commanding ${absDiff}-point lead. ${trailer} will need a historic comeback.`;
  }

  if (absDiff >= 15) {
    return `${leader} is in control with a ${absDiff}-point advantage.`;
  }

  // Comeback detection
  if (data.length >= 20) {
    const earlier = data[Math.floor(data.length * 0.5)];
    const earlierDiff = (Number(earlier.homeScore) || 0) - (Number(earlier.awayScore) || 0);
    // Check if trailing team has cut a significant deficit
    if (diff > 0 && earlierDiff > 0 && earlierDiff - diff >= 10) {
      return `${awayTeam.name} has trimmed a ${earlierDiff}-point deficit down to ${absDiff}. Comeback in progress.`;
    }
    if (diff < 0 && earlierDiff < 0 && Math.abs(earlierDiff) - absDiff >= 10) {
      return `${homeTeam.name} has trimmed a ${Math.abs(earlierDiff)}-point deficit down to ${absDiff}. Comeback in progress.`;
    }
  }

  // Tight game
  if (absDiff <= 3) {
    return `A tight contest — just ${absDiff} point${absDiff !== 1 ? 's' : ''} separate these teams.`;
  }

  return null;
}

export function generateGameNarrative(input: NarrativeInput): string {
  const { momentumData, homeTeam, awayTeam, period, clock, isLive } = input;

  if (!momentumData || momentumData.length < 5) {
    return "Gathering game data — analysis will begin once enough plays have been recorded.";
  }

  const sentences: string[] = [];

  // 1. Game situation / score context
  const situation = getGameSituation(momentumData, period, clock, homeTeam, awayTeam);
  if (situation) sentences.push(situation);

  // 2. Momentum trend
  const trend = detectMomentumTrend(momentumData);
  const trendTeam = trend.direction === 'home' ? homeTeam?.name : trend.direction === 'away' ? awayTeam?.name : null;

  if (trendTeam) {
    if (trend.volatility === 'building' && trend.strength !== 'slight') {
      sentences.push(`${trendTeam} is building ${trend.strength} momentum that's been growing steadily.`);
    } else if (trend.strength === 'strong') {
      sentences.push(`${trendTeam} has a firm grip on the game's momentum right now.`);
    } else if (trend.strength === 'moderate') {
      sentences.push(`Momentum is currently favoring ${trendTeam}.`);
    }
  } else if (trend.volatility === 'volatile') {
    sentences.push("Momentum is swinging back and forth — neither team can establish sustained control.");
  }

  // 3. Scoring runs
  const run = detectScoringRuns(momentumData, homeTeam, awayTeam);
  if (run) sentences.push(run);

  // 4. Lead changes (only if enough data for it to be meaningful)
  if (momentumData.length >= 30) {
    const leadChanges = detectLeadChanges(momentumData);
    if (leadChanges >= 5) {
      sentences.push(`A back-and-forth battle with ${leadChanges} lead changes so far.`);
    } else if (leadChanges >= 3) {
      sentences.push(`The lead has changed hands ${leadChanges} times.`);
    }
  }

  // 5. Key plays
  const keyPlays = findKeyPlays(momentumData, homeTeam, awayTeam);
  if (keyPlays) sentences.push(keyPlays);

  // 6. Biggest swing (only if we don't have too many sentences already)
  if (sentences.length < 3) {
    const swing = findBiggestSwing(momentumData.slice(-20));
    if (swing) {
      const swingTeam = getTeamForPlay(swing.play, homeTeam, awayTeam);
      sentences.push(`Biggest recent momentum shift: ${swing.play.text || `a ${swingTeam} play`} (${getQuarterLabel(swing.play.period)}, ${swing.play.clock}).`);
    }
  }

  // Fallback if nothing interesting detected
  if (sentences.length === 0) {
    if (period <= 1) {
      return "The game is in its early stages. Both teams are establishing their rhythm.";
    }
    return "The game flow is currently balanced with neither team establishing a clear sustained advantage.";
  }

  return sentences.join(' ');
}

export function generateTimeWindowNarrative(input: TimeWindowInput): string {
  const { momentumData, fullData, homeTeam, awayTeam, start, end } = input;

  if (!momentumData || momentumData.length < 3) {
    return "Not enough data in the selected time window for analysis.";
  }

  const sentences: string[] = [];
  const first = momentumData[0];
  const last = momentumData[momentumData.length - 1];
  const startTime = first.clock || 'N/A';
  const endTime = last.clock || 'N/A';
  const startQ = getQuarterLabel(first.period);
  const endQ = getQuarterLabel(last.period);
  const timeRange = startQ === endQ
    ? `${startTime} to ${endTime} in ${startQ}`
    : `${startQ} ${startTime} to ${endQ} ${endTime}`;

  // Momentum change over the window
  const momentumChange = last.momentum - first.momentum;
  const absMomentumChange = Math.abs(momentumChange);
  const avgMomentum = momentumData.reduce((sum, p) => sum + p.momentum, 0) / momentumData.length;

  if (absMomentumChange > 20) {
    const swingTeam = momentumChange > 0 ? homeTeam?.name : awayTeam?.name;
    sentences.push(`During ${timeRange}, ${swingTeam || 'one team'} generated a major momentum swing of ${absMomentumChange.toFixed(0)} points.`);
  } else if (absMomentumChange > 8) {
    const edgeTeam = momentumChange > 0 ? homeTeam?.name : awayTeam?.name;
    sentences.push(`From ${timeRange}: ${edgeTeam || 'one team'} gained a moderate momentum edge.`);
  } else {
    sentences.push(`From ${timeRange}: a relatively even stretch with neither team gaining a clear momentum advantage.`);
  }

  // Score change in window
  const homeStart = Number(first.homeScore) || 0;
  const awayStart = Number(first.awayScore) || 0;
  const homeEnd = Number(last.homeScore) || 0;
  const awayEnd = Number(last.awayScore) || 0;
  const homeScored = homeEnd - homeStart;
  const awayScored = awayEnd - awayStart;

  if (homeScored > 0 || awayScored > 0) {
    sentences.push(`Scoring: ${homeTeam?.name || 'Home'} ${homeScored} - ${awayTeam?.name || 'Away'} ${awayScored} during this stretch.`);
  }

  // Key plays in this window
  const highImpact = momentumData.filter(p => Math.abs(p.rawImpact) >= 6);
  if (highImpact.length > 0) {
    const playTypes: string[] = [];
    for (const play of highImpact.slice(0, 3)) {
      const text = play.text.toLowerCase();
      const team = getTeamForPlay(play, homeTeam, awayTeam);
      if (text.includes('block')) playTypes.push(`${team} block`);
      else if (text.includes('steal')) playTypes.push(`${team} steal`);
      else if (text.includes('dunk')) playTypes.push(`${team} dunk`);
      else if (text.includes('three') || text.includes('3pt')) playTypes.push(`${team} three`);
      else playTypes.push(`${team} big play`);
    }
    sentences.push(`Key moments: ${playTypes.join(', ')}.`);
  }

  // Volatility of this window
  const momentums = momentumData.map(p => p.momentum);
  const changes: number[] = [];
  for (let i = 1; i < momentums.length; i++) {
    changes.push(Math.abs(momentums[i] - momentums[i - 1]));
  }
  const avgChange = changes.length > 0 ? changes.reduce((s, v) => s + v, 0) / changes.length : 0;

  if (avgChange > 15) {
    sentences.push("This was a volatile stretch with rapid momentum swings.");
  } else if (avgChange < 3 && momentumData.length > 5) {
    sentences.push("Momentum was stable during this stretch — a controlled phase of play.");
  }

  return sentences.join(' ');
}
