# Database Package

This package contains the database schema, migrations, and utilities for the SkyNote AI application.

## Overview

The database uses Cloudflare D1 (SQLite at the edge) for metadata storage, with content stored in R2 object storage.

## Database Schema

### Tables

1. **users** - User authentication and profile information
2. **notes** - Note metadata (content stored in R2)
3. **tags** - Tag definitions with optional colors
4. **note_tags** - Many-to-many relationship between notes and tags
5. **search_history** - User search query tracking
6. **note_versions** - Version history for notes

### Key Design Decisions

- **Hybrid Storage**: Metadata in D1, content in R2
- **Soft Delete**: Notes have `deleted_at` for recovery
- **Dual Format**: BlockNote JSON (primary) + Markdown (AutoRAG)
- **Performance**: Comprehensive indexing strategy

## Usage

### Run Migrations

```bash
# Local development
pnpm migrate

# Remote/production
pnpm migrate:remote
```

### Seed Development Data

```bash
# Local development
pnpm seed

# Remote/production
pnpm seed:remote
```

### Validate Migrations

```bash
pnpm migrate:validate
```

### List Migrations

```bash
pnpm migrate:list
```

## Migration Structure

- **migrations/**: Contains migration files
- **seeds/**: Contains seed data for development
- **src/**: TypeScript utilities for migrations

## File Structure

```
packages/database/
├── migrations/
│   ├── 0001_initial_schema.sql       # Initial schema
│   └── 0001_initial_schema_rollback.sql  # Rollback script
├── seeds/
│   └── 001_development_data.sql      # Development seed data
├── src/
│   ├── migrate.ts                    # Migration utilities
│   ├── schema.ts                     # Schema types
│   └── index.ts                      # Package exports
└── package.json
```

## Development Setup

1. Ensure Cloudflare D1 database is created
2. Update `wrangler.toml` with database ID
3. Run migrations: `pnpm migrate`
4. Seed data: `pnpm seed`

## Production Deployment

1. Create production database
2. Update `wrangler.toml` production environment
3. Run migrations: `pnpm migrate:prod`
4. Do not seed production data (use real data)

## Schema Changes

1. Create new migration file: `wrangler d1 migrations create <name>`
2. Edit migration file with SQL
3. Create rollback file with reverse operations
4. Test locally first
5. Apply to production

## Notes

- All migrations are stored in the root `/migrations` directory (wrangler requirement)
- Rollback scripts are provided but not automatically applied
- Use `--remote` flag for production operations
- D1 databases are eventually consistent at the edge