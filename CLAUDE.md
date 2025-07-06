# CLAUDE.md - SkyNote AI Project Guide

## Project Overview
You are working on **SkyNote AI**, an AI-powered notes application that uses Cloudflare's ecosystem to provide intelligent search, content discovery, and conversational interactions with personal knowledge bases.

## Key Project Documents

### 📋 [Product Requirements Document (PRD.md)](./PRD.md)
Contains the complete product specification including:
- Technical architecture and system design
- Feature specifications and requirements
- API specifications and data models
- User interface designs
- Performance and security requirements

### ✅ [Development Tasks (TASKS.md)](./TASKS.md)
Contains 26 detailed development tasks with:
- Implementation steps and code examples
- Completion checklists for each task
- Dependencies and execution order
- Time estimates and priorities

## Project Structure
```
skynote-ai/
├── apps/
│   ├── web/                 # React frontend with BlockNote editor
│   └── worker/              # Cloudflare Worker backend
├── packages/
│   ├── shared/              # Shared types and utilities
│   ├── database/            # D1 schema and migrations
│   └── ui/                  # Shared UI components
├── PRD.md                   # Product Requirements Document
├── TASKS.md                 # Development tasks with checklists
└── CLAUDE.md                # This file - AI assistant guide
```

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Editor**: BlockNote.js (Notion-style block editor)
- **Styling**: TailwindCSS + Shadcn/ui
- **State**: Zustand + TanStack Query

### Backend
- **Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite at the edge)
- **Storage**: R2 (S3-compatible)
- **Queue**: Cloudflare Queues
- **AI/RAG**: Cloudflare AutoRAG + Workers AI

## Key Architectural Decisions

### 1. Dual Storage Format
- **JSON Format**: Store BlockNote's native format in R2 for perfect fidelity
- **Markdown Format**: Auto-generated via queue processing for AutoRAG indexing

### 2. Server-Side Processing
- Frontend sends only BlockNote JSON
- Worker queues markdown conversion
- Background processing for better performance

### 3. Queue-Based Architecture
```typescript
// Frontend saves JSON
await fetch('/api/notes/:id', { 
  method: 'PUT', 
  body: JSON.stringify({ content: blockNoteJSON }) 
});

// Backend queues conversion
await env.NOTE_QUEUE.send({
  type: 'convert-to-markdown',
  noteId,
  content
});

// Queue consumer processes
const markdown = await convertBlocksToMarkdown(content);
await env.R2.put(`notes/${noteId}/content.md`, markdown);
```

## Current Development Phase

Check TASKS.md for the current phase. The project is organized into 5 phases over 8 weeks:

1. **Foundation** (Week 1-2): Infrastructure and project setup
2. **Core Features** (Week 3-4): CRUD operations and editor
3. **Advanced Features** (Week 5-6): Search and AI chat
4. **AI Integration** (Week 7): AutoRAG and smart features
5. **Polish & Launch** (Week 8): Testing and deployment

## Working on Tasks

When working on a task:

1. **Find the task** in TASKS.md (e.g., TASK-005)
2. **Check dependencies** - ensure prerequisite tasks are complete
3. **Follow the implementation steps** provided
4. **Use the checklist** to track progress
5. **Refer to PRD.md** for detailed specifications

### Example Task Workflow
```bash
# Starting TASK-005: Implement Notes CRUD API
# 1. Check that TASK-004 is complete (Worker foundation)
# 2. Implement each endpoint following the code examples
# 3. Test each checklist item
# 4. Mark items complete as you go
```

## Git Workflow Guideline
- **Whenever a new task is taken, switch to main, pull latest and create a new feature branch from there**

## API Patterns

### Standard Response Format
```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { code: 'ERROR_CODE', message: 'Description' } }
```

### Authentication
All API routes under `/api/*` require authentication via JWT token in headers:
```typescript
Authorization: Bearer <jwt-token>
```

## Environment Variables

### Development (.env.local)
```bash
# Cloudflare
CF_ACCOUNT_ID=your-account-id
CF_API_TOKEN=your-api-token

# R2
R2_BUCKET_NAME=cloudnotes-dev-storage

# D1
D1_DATABASE_ID=your-database-id

# AutoRAG
AUTORAG_INSTANCE_ID=your-autorag-id

# Queue
QUEUE_NAME=note-processing-dev
```

### Wrangler Configuration
```toml
name = "cloudnotes-api-dev"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "R2"
bucket_name = "cloudnotes-dev-storage"

[[d1_databases]]
binding = "DB"
database_name = "cloudnotes-db-dev"
database_id = "your-database-id"

[[queues.producers]]
queue = "note-processing-dev"
binding = "NOTE_QUEUE"
```

## Common Commands

```bash
# Development
pnpm dev              # Start all services in dev mode
pnpm dev:web          # Start only frontend
pnpm dev:worker       # Start only backend

# Database
pnpm db:migrate       # Run D1 migrations
pnpm db:seed          # Seed development data

# Testing
pnpm test            # Run all tests
pnpm test:unit       # Unit tests only
pnpm test:e2e        # E2E tests

# Deployment
pnpm deploy:dev      # Deploy to development
pnpm deploy:prod     # Deploy to production

# Utilities
pnpm lint            # Run ESLint
pnpm typecheck       # Run TypeScript checks
pnpm build           # Build all packages
```

## Debugging Tips

### 1. Worker Logs
```bash
wrangler tail --env dev
```

### 2. Queue Issues
- Check queue depth in Cloudflare dashboard
- Look for messages in dead letter queue
- Verify message format matches type definitions

### 3. AutoRAG Indexing
- Verify markdown files exist in R2
- Check AutoRAG dashboard for indexing status
- Test queries directly in AutoRAG playground

### 4. Authentication Errors
- Verify JWT token is valid
- Check Cloudflare Access configuration
- Ensure user exists in D1 database

## Code Quality Standards

1. **TypeScript**: Strict mode enabled, no `any` types
2. **Testing**: Minimum 80% coverage for new code
3. **Comments**: Only for complex logic, prefer self-documenting code
4. **Commits**: Conventional commits (feat:, fix:, chore:, etc.)
5. **PR Size**: Keep PRs under 400 lines when possible

## Getting Help

1. **Architecture Questions**: Refer to PRD.md Section 3
2. **Implementation Details**: Check TASKS.md for the specific task
3. **API Specifications**: See PRD.md Section 6
4. **UI/UX Guidelines**: Review PRD.md Section 7

## Important Notes

- **Never commit secrets** - Use environment variables
- **Always update checklists** in TASKS.md as you complete items
- **Test queue processing** locally before deploying
- **Monitor AutoRAG costs** - Set up usage alerts
- **Follow the task order** - Dependencies matter

## Project Goals

1. **User Experience**: Notion-like editing with powerful AI search
2. **Performance**: Sub-second response times for common operations
3. **Scalability**: Support 10,000+ notes per user
4. **Reliability**: 99.9% uptime with graceful degradation

---

When in doubt, refer to:
- **PRD.md** for what to build
- **TASKS.md** for how to build it
- This file for context and guidelines

Happy coding! 🚀