-- 0004_clean_data.sql
-- Limpa TODOS os dados do D1, mantendo apenas a estrutura das tabelas.
-- Executar com: npx wrangler d1 migrations apply historias_que_rolamos_d1 --remote

-- Ordem de exclusão respeita as foreign keys (filhos antes dos pais)
DELETE FROM change_log;
DELETE FROM media_files;
DELETE FROM campaign_members;
DELETE FROM memory_characters;
DELETE FROM media;
DELETE FROM tokens;
DELETE FROM memories;
DELETE FROM characters;
DELETE FROM campaigns;
DELETE FROM users;

-- Resetar o AUTOINCREMENT da change_log para começar do 1
DELETE FROM sqlite_sequence WHERE name = 'change_log';