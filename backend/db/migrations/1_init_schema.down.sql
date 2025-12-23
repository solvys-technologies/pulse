-- Rollback migration for initial schema

DROP INDEX IF EXISTS idx_accounts_projectx_id;
DROP INDEX IF EXISTS idx_accounts_user_id;
DROP TABLE IF EXISTS accounts;
