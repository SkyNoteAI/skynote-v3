-- SkyNote AI - Development Seed Data
-- Created: 2025-01-01
-- Description: Sample data for development and testing

-- Insert sample users
INSERT INTO users (id, email, name, avatar_url) VALUES
    ('user_1', 'test@example.com', 'Test User', 'https://via.placeholder.com/150'),
    ('user_2', 'demo@example.com', 'Demo User', 'https://via.placeholder.com/150'),
    ('user_3', 'admin@example.com', 'Admin User', 'https://via.placeholder.com/150');

-- Insert sample tags
INSERT INTO tags (id, name, color) VALUES
    ('tag_1', 'work', '#3B82F6'),
    ('tag_2', 'personal', '#10B981'),
    ('tag_3', 'project', '#F59E0B'),
    ('tag_4', 'idea', '#8B5CF6'),
    ('tag_5', 'meeting', '#EF4444'),
    ('tag_6', 'todo', '#F97316'),
    ('tag_7', 'research', '#06B6D4'),
    ('tag_8', 'draft', '#84CC16');

-- Insert sample notes
INSERT INTO notes (id, user_id, title, slug, folder_path, r2_key_prefix, word_count, block_count, has_images, markdown_generated_at) VALUES
    ('note_1', 'user_1', 'Getting Started with SkyNote', 'getting-started-with-skynote', '/welcome', 'users/user_1/notes/note_1', 150, 8, false, '2025-01-01T00:00:00Z'),
    ('note_2', 'user_1', 'Project Planning Template', 'project-planning-template', '/templates', 'users/user_1/notes/note_2', 300, 12, false, '2025-01-01T01:00:00Z'),
    ('note_3', 'user_1', 'Meeting Notes - Q1 Planning', 'meeting-notes-q1-planning', '/meetings/2024', 'users/user_1/notes/note_3', 450, 18, false, '2025-01-01T02:00:00Z'),
    ('note_4', 'user_1', 'Research: AI-Powered Knowledge Management', 'research-ai-knowledge-management', '/research', 'users/user_1/notes/note_4', 800, 25, true, '2025-01-01T03:00:00Z'),
    ('note_5', 'user_1', 'Personal Goals 2024', 'personal-goals-2024', '/personal', 'users/user_1/notes/note_5', 200, 10, false, '2025-01-01T04:00:00Z'),
    ('note_6', 'user_2', 'Demo Note for Testing', 'demo-note-testing', '/demo', 'users/user_2/notes/note_6', 100, 5, false, '2025-01-01T05:00:00Z'),
    ('note_7', 'user_2', 'How to Use Semantic Search', 'how-to-use-semantic-search', '/tutorials', 'users/user_2/notes/note_7', 250, 12, false, '2025-01-01T06:00:00Z'),
    ('note_8', 'user_1', 'Archived Note Example', 'archived-note-example', '/archive', 'users/user_1/notes/note_8', 120, 6, false, '2024-12-01T00:00:00Z');

-- Insert note-tag relationships
INSERT INTO note_tags (note_id, tag_id) VALUES
    ('note_1', 'tag_1'),  -- Getting Started - work
    ('note_1', 'tag_7'),  -- Getting Started - research
    ('note_2', 'tag_1'),  -- Project Planning - work
    ('note_2', 'tag_3'),  -- Project Planning - project
    ('note_3', 'tag_1'),  -- Meeting Notes - work
    ('note_3', 'tag_5'),  -- Meeting Notes - meeting
    ('note_4', 'tag_7'),  -- Research - research
    ('note_4', 'tag_4'),  -- Research - idea
    ('note_5', 'tag_2'),  -- Personal Goals - personal
    ('note_5', 'tag_6'),  -- Personal Goals - todo
    ('note_6', 'tag_8'),  -- Demo Note - draft
    ('note_7', 'tag_7'),  -- Semantic Search - research
    ('note_8', 'tag_8');  -- Archived Note - draft

-- Insert sample search history
INSERT INTO search_history (id, user_id, query, search_type, results_count) VALUES
    ('search_1', 'user_1', 'project planning', 'keyword', 2),
    ('search_2', 'user_1', 'meeting notes', 'keyword', 1),
    ('search_3', 'user_1', 'AI knowledge management', 'semantic', 3),
    ('search_4', 'user_1', 'personal goals', 'keyword', 1),
    ('search_5', 'user_2', 'semantic search tutorial', 'semantic', 1),
    ('search_6', 'user_1', 'templates', 'keyword', 1);

-- Insert sample note versions
INSERT INTO note_versions (id, note_id, version_number, r2_key, created_by) VALUES
    ('version_1', 'note_1', 1, 'users/user_1/notes/note_1/versions/2025-01-01T00:00:00Z.json', 'user_1'),
    ('version_2', 'note_2', 1, 'users/user_1/notes/note_2/versions/2025-01-01T01:00:00Z.json', 'user_1'),
    ('version_3', 'note_2', 2, 'users/user_1/notes/note_2/versions/2025-01-01T02:30:00Z.json', 'user_1'),
    ('version_4', 'note_3', 1, 'users/user_1/notes/note_3/versions/2025-01-01T02:00:00Z.json', 'user_1'),
    ('version_5', 'note_4', 1, 'users/user_1/notes/note_4/versions/2025-01-01T03:00:00Z.json', 'user_1'),
    ('version_6', 'note_5', 1, 'users/user_1/notes/note_5/versions/2025-01-01T04:00:00Z.json', 'user_1'),
    ('version_7', 'note_6', 1, 'users/user_2/notes/note_6/versions/2025-01-01T05:00:00Z.json', 'user_2'),
    ('version_8', 'note_7', 1, 'users/user_2/notes/note_7/versions/2025-01-01T06:00:00Z.json', 'user_2');