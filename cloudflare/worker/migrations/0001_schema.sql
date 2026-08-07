-- 0001_schema.sql
-- Create initial schema for "Histórias que Rolamos" local-first backend sync

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    system TEXT NOT NULL,
    description TEXT,
    cover_image_id TEXT,
    start_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS campaign_members (
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('MASTER', 'PLAYER')),
    PRIMARY KEY (campaign_id, user_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    player_name TEXT,
    name TEXT NOT NULL,
    character_type TEXT NOT NULL CHECK(character_type IN ('hero', 'ally')),
    race TEXT,
    origin TEXT,
    class TEXT,
    level INTEGER NOT NULL,
    hp INTEGER NOT NULL,
    mp INTEGER NOT NULL,
    image_id TEXT,
    sheet_media_id TEXT,
    concept TEXT,
    description TEXT,
    notes TEXT,
    evolutions TEXT, -- JSON text
    created_at TEXT NOT NULL,
    updated_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    hero_descriptions TEXT, -- JSON text
    event_date TEXT NOT NULL,
    type TEXT NOT NULL,
    image_id TEXT,
    character_ids TEXT, -- JSON text
    tags TEXT, -- JSON text
    comments TEXT, -- JSON text
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_characters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    level_reached INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    media_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Player Character', 'NPC', 'Enemy')),
    related_character_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    title TEXT,
    description TEXT,
    event_date TEXT,
    related_character_id TEXT,
    related_memory_id TEXT,
    tags TEXT, -- JSON text
    is_gallery INTEGER NOT NULL DEFAULT 1, -- 0 or 1
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS change_log (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'UPDATE', 'DELETE')),
    version INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    payload TEXT, -- JSON string representing the full entity (null for DELETE)
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexing for fast search and sync queries
CREATE INDEX IF NOT EXISTS idx_change_log_since ON change_log(campaign_id, sequence);
CREATE INDEX IF NOT EXISTS idx_campaign_members_user ON campaign_members(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_memories_campaign ON memories(campaign_id);
CREATE INDEX IF NOT EXISTS idx_media_campaign ON media(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tokens_campaign ON tokens(campaign_id);
