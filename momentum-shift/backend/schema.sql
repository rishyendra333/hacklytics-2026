-- Schema for Momentum Shift backend

-- Table: game_fingerprints
-- Stores the normalized 20-point momentum vector for each historical game.
-- Used by the Game DNA pattern matcher to find similar historic games.
CREATE TABLE game_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id TEXT NOT NULL UNIQUE,
    season TEXT,
    home_team TEXT,
    away_team TEXT,
    final_score TEXT,
    momentum_vector JSONB NOT NULL,    -- Stores a float array (20 buckets)
    metadata JSONB,                    -- Any extra info (date, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: player_momentum_impact
-- Stores pre-calculated or rolling averages of player impact.
CREATE TABLE player_momentum_impact (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id TEXT NOT NULL UNIQUE,
    player_name TEXT NOT NULL,
    team TEXT,
    avg_momentum_contribution FLOAT,    -- E.g. +0.5 or -0.2
    games_sampled INT DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
