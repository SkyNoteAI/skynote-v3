-- SkyNote AI - Initial Database Schema Rollback
-- Created: 2025-01-01
-- Description: Rollback the initial schema migration

-- Disable foreign key constraints for safe cleanup
PRAGMA foreign_keys = OFF;

-- Drop indexes first
DROP INDEX IF EXISTS idx_tags_name;
DROP INDEX IF EXISTS idx_note_versions_created_at;
DROP INDEX IF EXISTS idx_note_versions_note_id;
DROP INDEX IF EXISTS idx_search_history_created_at;
DROP INDEX IF EXISTS idx_search_history_user_id;
DROP INDEX IF EXISTS idx_notes_folder_path;
DROP INDEX IF EXISTS idx_notes_updated_at;
DROP INDEX IF EXISTS idx_notes_created_at;
DROP INDEX IF EXISTS idx_notes_deleted_at;
DROP INDEX IF EXISTS idx_notes_user_id;

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS note_versions;
DROP TABLE IF EXISTS search_history;
DROP TABLE IF EXISTS note_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;