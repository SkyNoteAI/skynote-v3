// Database schema definitions
export const DATABASE_SCHEMA = {
  users: {
    id: 'TEXT PRIMARY KEY',
    email: 'TEXT UNIQUE NOT NULL',
    name: 'TEXT',
    avatar_url: 'TEXT',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
  },
  notes: {
    id: 'TEXT PRIMARY KEY',
    title: 'TEXT NOT NULL',
    user_id: 'TEXT NOT NULL',
    folder_path: 'TEXT',
    tags: 'TEXT', // JSON array
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    deleted_at: 'DATETIME'
  }
};