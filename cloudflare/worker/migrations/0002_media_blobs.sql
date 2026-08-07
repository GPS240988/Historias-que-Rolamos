-- 0002_media_blobs.sql
-- Store media binary data as native BLOB directly in D1 (replaces R2 dependency)
-- BLOB = raw binary, zero encoding overhead (unlike Base64 which adds 33%)

ALTER TABLE media ADD COLUMN blob_data BLOB;
ALTER TABLE media ADD COLUMN thumbnail_data BLOB;
