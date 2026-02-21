const express = require('express');
const cors = require('cors');
const { calculateMomentumSeries } = require('./momentumAlgorithm');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Proxy for scoreboard (all games)
app.get('/api/games', async (req, res) => {
    try {
        const { date } = req.query; // e.g. ?date=20240215
        let url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

        if (date) {
            url += `?dates=${date}`;
        }

        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching scoreboard:', error.message);
        res.status(500).json({ error: 'Failed to fetch scoreboard' });
    }
});

// Proxy for a specific game's play-by-play and summary
app.get('/api/game/:id', async (req, res) => {
    try {
        const gameId = req.params.id;

        // Fetch both summary and play-by-play data concurrently
        const [summaryResponse, pbpResponse] = await Promise.all([
            axios.get(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`),
            axios.get(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/playbyplay?event=${gameId}`)
        ]);

        const summaryData = summaryResponse.data;
        let plays = summaryData.plays || [];

        // Extract home/away team IDs from boxscore or header
        const boxscore = summaryData.boxscore;
        let homeTeamId = null;
        let awayTeamId = null;

        if (boxscore && boxscore.teams) {
            const team1 = boxscore.teams[0];
            const team2 = boxscore.teams[1];
            if (team1.homeAway === 'home') {
                homeTeamId = team1.team.id;
                awayTeamId = team2.team.id;
            } else {
                homeTeamId = team2.team.id;
                awayTeamId = team1.team.id;
            }
        }

        const momentumHistory = calculateMomentumSeries(plays, homeTeamId, awayTeamId);

        res.json({
            summary: summaryData,
            playByPlay: pbpResponse.data,
            momentum: momentumHistory,
            homeTeamId,
            awayTeamId
        });
    } catch (error) {
        console.error(`Error fetching game ${req.params.id}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch game data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
