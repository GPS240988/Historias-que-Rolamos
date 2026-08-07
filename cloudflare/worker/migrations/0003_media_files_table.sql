-- 0003_media_files_table.sql
-- Create media_files table to store raw binaries (independent of metadata sync order)

CREATE TABLE IF NOT EXISTS media_files (
    id TEXT PRIMARY KEY,
    data BLOB NOT NULL
);
