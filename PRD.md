# Product Requirements Document (PRD)
## AI-Powered Notes Application with Cloudflare AutoRAG

### 1. Executive Summary

**Product Name**: CloudNotes AI  
**Version**: 1.0  
**Date**: January 2025  
**Product Owner**: [To be assigned]  
**Development Team**: [To be assigned]

**Vision**: Build a modern, AI-powered notes application that leverages Cloudflare's AutoRAG service to provide intelligent search, content discovery, and conversational interactions with personal knowledge bases.

**Key Differentiators**:
- Semantic search across all notes
- AI-powered Q&A about note contents
- Automatic knowledge graph creation
- Edge-first architecture for global performance
- Zero-configuration RAG pipeline
- Notion-style block editor experience

### 2. Product Overview

#### 2.1 Problem Statement
Users struggle to find information in their growing collection of notes. Traditional keyword search fails to surface relevant content when users don't remember exact terms. Users want to query their notes conversationally and discover connections between ideas.

#### 2.2 Solution
A notes application that automatically indexes all content using Cloudflare AutoRAG, enabling semantic search and conversational AI interactions with personal knowledge bases, while providing a modern block-based editing experience.

#### 2.3 Target Users
- Knowledge workers
- Students and researchers
- Content creators
- Technical writers
- Personal knowledge management enthusiasts

### 3. Technical Architecture

#### 3.1 System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────┬───────────────────┬──────────────────────────┤
│   Web App       │   Mobile Web      │   API Clients            │
│   (React)       │   (Responsive)    │   (REST/GraphQL)         │
└─────────────────┴───────────────────┴──────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
├─────────────────┬───────────────────┬──────────────────────────┤
│  Pages (CDN)    │  Workers (API)    │  Access (Auth)           │
└─────────────────┴───────────────────┴──────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Processing Layer                            │
├─────────────────┬───────────────────┬──────────────────────────┤
│  Queues         │  Durable Objects  │  Scheduled Workers       │
│  (Async Tasks)  │  (Real-time Sync) │  (Batch Processing)      │
└─────────────────┴───────────────────┴──────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data & AI Layer                             │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│  R2 Storage  │   AutoRAG    │  Vectorize   │    D1 Database    │
│  (Files)     │   (Pipeline) │  (Vectors)   │    (Metadata)     │
└──────────────┴──────────────┴──────────────┴──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Workers AI Models                           │
├──────────────────────┬──────────────────────────────────────────┤
│  Embedding Models    │   Generation Models                      │
│  (@cf/baai/bge-*)   │   (@cf/meta/llama-*)                    │
└──────────────────────┴──────────────────────────────────────────┘
```

#### 3.2 Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Editor**: BlockNote.js (block-based rich text editor)
- **UI Framework**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand or TanStack Query
- **Backend**: Cloudflare Workers (TypeScript)
- **Queue System**: Cloudflare Queues
- **Database**: D1 (SQLite edge database)
- **Storage**: R2 (S3-compatible object storage)
- **AI/RAG**: Cloudflare AutoRAG + Workers AI
- **Authentication**: Cloudflare Access
- **Hosting**: Cloudflare Pages

### 4. Feature Specifications

#### 4.1 Core Features

##### 4.1.1 Note Management
**Priority**: P0 (Must Have)

- **Create Note**
  - BlockNote.js editor with Notion-style blocks
  - Slash commands for quick block insertion
  - Auto-save functionality (debounced, every 2 seconds after changes)
  - Keyboard shortcuts support
  
- **Edit Note**
  - Block-based editing with drag-and-drop
  - Real-time collaborative editing (future)
  - Version history with diff view
  - Conflict resolution for concurrent edits
  
- **Delete Note**
  - Soft delete with 30-day recovery
  - Bulk delete operations
  - Permanent delete with confirmation

- **Organize Notes**
  - Folder/directory structure
  - Tag system with auto-complete
  - Star/favorite notes
  - Sort by: date, title, relevance

##### 4.1.2 Block Editor Features
**Priority**: P0 (Must Have)

- **Supported Block Types**
  - Text blocks (paragraph, headings 1-6)
  - Lists (bullet, numbered, checklist)
  - Code blocks with syntax highlighting
  - Tables
  - Images with R2 storage
  - Block quotes
  - Horizontal rules
  
- **Editor UX Features**
  - Drag and drop block reordering
  - Nested blocks
  - Slash menu for quick insertion
  - @ mentions for linking notes
  - Inline formatting toolbar
  - Theme support (light/dark)

##### 4.1.3 Search Capabilities
**Priority**: P0 (Must Have)

- **Keyword Search**
  - Full-text search across all notes
  - Search within specific folders/tags
  - Search history
  
- **Semantic Search** (via AutoRAG)
  - Natural language queries
  - Find similar notes
  - Concept-based discovery
  - Multi-language support

- **Advanced Filters**
  - Date range
  - Tags
  - File size
  - Has attachments

##### 4.1.4 AI-Powered Features
**Priority**: P0 (Must Have)

- **RAG Chat Interface**
  - Ask questions about your notes
  - Get summaries of multiple notes
  - Find connections between ideas
  - Citation of source notes
  
- **Smart Suggestions**
  - Related notes sidebar (real-time updates while editing)
  - Auto-tagging suggestions
  - Title generation from content
  - Dynamic content recommendations

##### 4.1.5 User Management
**Priority**: P1 (Should Have)

- **Authentication**
  - Email/password
  - OAuth (Google, GitHub)
  - SSO via Cloudflare Access
  
- **User Profile**
  - Avatar and display name
  - Preferences (theme, editor settings)
  - API key management

#### 4.2 Advanced Features

##### 4.2.1 Collaboration
**Priority**: P2 (Nice to Have)

- Share notes via public link
- Collaborative editing
- Comments and annotations
- Activity feed

##### 4.2.2 Export/Import
**Priority**: P1 (Should Have)

- Export formats: MD, PDF, HTML, DOCX
- Bulk export as ZIP
- Import from: Notion, Evernote, Obsidian
- API for programmatic access

##### 4.2.3 Integrations
**Priority**: P2 (Nice to Have)

- Browser extension for web clipping
- Mobile app (PWA initially)
- Zapier/Make integration
- Webhook support

### 5. Data Models

#### 5.1 Database Schema (D1)

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notes metadata table
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT,
    folder_path TEXT,
    r2_key_prefix TEXT NOT NULL, -- e.g., 'users/123/notes/456'
    word_count INTEGER,
    block_count INTEGER,
    has_images BOOLEAN DEFAULT FALSE,
    markdown_generated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tags table
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT
);

-- Note tags relationship
CREATE TABLE note_tags (
    note_id TEXT,
    tag_id TEXT,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- Search history
CREATE TABLE search_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    search_type TEXT, -- 'keyword' or 'semantic'
    results_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Note versions (for history)
CREATE TABLE note_versions (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    r2_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### 5.2 R2 Storage Structure
```
/users/{userId}/
  /notes/
    /{noteId}/
      /content.json         # BlockNote JSON format (source of truth)
      /content.md          # Auto-generated markdown for AutoRAG
      /metadata.json       # Additional metadata
      /versions/
        /{timestamp}.json  # Version history
  /attachments/
    /{noteId}/
      /{attachmentId}      # Images, files referenced in notes
```

### 6. API Specifications

#### 6.1 REST API Endpoints

```typescript
// Authentication
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me

// Notes CRUD
GET    /api/notes                 # List notes with pagination
POST   /api/notes                 # Create new note
GET    /api/notes/:id            # Get single note
PUT    /api/notes/:id            # Update note
DELETE /api/notes/:id            # Delete note
POST   /api/notes/:id/restore    # Restore deleted note

// Search
GET    /api/search               # Search notes
GET    /api/search/semantic      # Semantic search via AutoRAG
GET    /api/search/similar/:id   # Find similar notes

// AI Features
POST   /api/chat                 # RAG chat endpoint
POST   /api/summarize            # Summarize notes
POST   /api/suggest/tags         # Suggest tags for note
POST   /api/suggest/title        # Generate title from content

// Tags
GET    /api/tags                 # List all tags
POST   /api/tags                 # Create tag
DELETE /api/tags/:id            # Delete tag

// Export
GET    /api/export/note/:id     # Export single note
POST   /api/export/bulk         # Export multiple notes

// Attachments
POST   /api/attachments/upload   # Upload attachment
GET    /api/attachments/:id      # Get attachment
DELETE /api/attachments/:id      # Delete attachment
```

#### 6.2 Request/Response Examples

```typescript
// Create/Update Note Request
PUT /api/notes/note123
{
  "title": "Meeting Notes - Q1 Planning",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "props": { "level": 1 },
        "content": "Q1 Planning Meeting"
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "Discussion about Q1 objectives" }
        ]
      }
    ]
  },
  "folder": "/work/meetings",
  "tags": ["meeting", "planning", "q1-2025"]
}

// Server-side processing flow
async function handleNoteUpdate(request: Request, env: Env) {
  const noteId = params.noteId;
  const { title, content, folder, tags } = await request.json();
  
  // 1. Save BlockNote JSON immediately
  await env.R2.put(
    `users/${userId}/notes/${noteId}/content.json`,
    JSON.stringify(content)
  );
  
  // 2. Update metadata in D1
  await env.DB.prepare(`
    UPDATE notes 
    SET title = ?, folder_path = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(title, folder, noteId).run();
  
  // 3. Queue markdown conversion
  await env.NOTE_QUEUE.send({
    type: 'convert-to-markdown',
    noteId,
    userId,
    content,
    title
  });
  
  return json({ success: true, noteId });
}

// Queue consumer for markdown conversion
export async function queue(batch: MessageBatch, env: Env) {
  for (const message of batch.messages) {
    const { type, noteId, userId, content } = message.body;
    
    if (type === 'convert-to-markdown') {
      try {
        // Convert BlockNote blocks to markdown
        const markdown = await convertBlocksToMarkdown(content);
        
        // Save markdown for AutoRAG
        await env.R2.put(
          `users/${userId}/notes/${noteId}/content.md`,
          markdown
        );
        
        // Update conversion timestamp
        await env.DB.prepare(`
          UPDATE notes 
          SET markdown_generated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).bind(noteId).run();
        
        message.ack();
      } catch (error) {
        // Retry logic
        if (message.attempts < 3) {
          message.retry();
        } else {
          console.error(`Failed to convert note ${noteId}:`, error);
          message.ack(); // Acknowledge to prevent infinite retries
        }
      }
    }
  }
}

// Search Response
GET /api/search/semantic?q=planning+meetings+action+items
{
  "results": [
    {
      "id": "note123",
      "title": "Meeting Notes - Q1 Planning",
      "excerpt": "...planning meeting with action items for Q1...",
      "relevance_score": 0.92,
      "matched_chunks": [
        {
          "text": "## Action Items\n- Complete user research by Feb 15",
          "score": 0.95
        }
      ],
      "folder": "/work/meetings",
      "tags": ["meeting", "planning"]
    }
  ],
  "total": 15,
  "page": 1
}

// RAG Chat Request
POST /api/chat
{
  "message": "What were the action items from last week's planning meeting?",
  "context_limit": 5
}

// RAG Chat Response
{
  "response": "Based on your notes from the Q1 Planning Meeting last week, here are the action items:\n\n1. Complete user research by Feb 15\n2. Finalize technical architecture by Feb 20\n3. Begin sprint planning for March release",
  "sources": [
    {
      "note_id": "note123",
      "title": "Meeting Notes - Q1 Planning",
      "relevance": 0.92
    }
  ]
}
```

### 7. User Interface Specifications

#### 7.1 Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header (Logo | Search Bar | User Menu)                  │
├───────────────┬─────────────────────┬──────────────────┤
│               │                     │                   │
│  Sidebar      │   Main Content      │   Right Panel    │
│               │                     │                   │
│ - Folders     │  - BlockNote Editor │  - AI Chat       │
│ - Tags        │  - Note List        │  - Related Notes │
│ - Recent      │  - Search Results   │    (Real-time)    │
│ - Starred     │                     │  - Note Info     │
│               │                     │                   │
└───────────────┴─────────────────────┴──────────────────┘
```

#### 7.2 Key UI Components

##### 7.2.1 BlockNote Editor Component
```typescript
import { BlockNoteEditor } from "@blocknote/react";
import "@blocknote/react/style.css";

function NoteEditor({ noteId, initialContent }) {
  const editor = useCreateBlockNote({
    initialContent: initialContent,
    uploadFile: async (file) => {
      // Upload to R2 via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noteId", noteId);
      
      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData
      });
      
      const { url } = await response.json();
      return url;
    }
  });

  // Auto-save with debouncing
  const saveNote = useDebouncedCallback(
    async () => {
      const blocks = editor.document;
      await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: blocks,
          title: extractTitle(blocks)
        })
      });
    },
    2000 // 2 second debounce
  );

  return (
    <BlockNoteEditor
      editor={editor}
      theme="light"
      onChange={saveNote}
      placeholder="Start typing or press '/' for commands..."
    />
  );
}
```

##### 7.2.2 Search Interface
- Unified search bar with type-ahead
- Search mode toggle (keyword/semantic)
- Filter chips below search bar
- Results with highlighted matches
- Loading states for semantic search

##### 7.2.3 AI Chat Interface
- Floating chat widget or dedicated panel
- Message history with citations
- Suggested questions based on current note
- Copy/insert responses to notes
- Streaming responses for better UX

##### 7.2.4 Related Notes Sidebar
- Real-time updates as user types
- Similarity scoring visualization
- Preview cards with excerpts
- Quick navigation to related notes
- Relevance threshold controls
- Max 5-10 related notes shown
- Updates triggered on:
  - Content changes (debounced)
  - Note saves
  - Manual refresh button

### 8. Performance Requirements

#### 8.1 Response Times
- Page load: < 2 seconds
- Note save (JSON): < 300ms
- Markdown conversion: < 5 seconds (async)
- Search results: < 500ms (keyword), < 2s (semantic)
- AI chat response: < 5 seconds (streaming)

#### 8.2 Scalability
- Support 10,000+ notes per user
- Handle 100+ concurrent users per Worker
- Queue processing: 1000 notes/minute
- AutoRAG indexing within 5 minutes of markdown generation

#### 8.3 Availability
- 99.9% uptime SLA
- Graceful degradation if AI services unavailable
- Offline mode with sync capabilities
- Queue retry mechanism for failed conversions

### 9. Security Requirements

#### 9.1 Authentication & Authorization
- Multi-factor authentication support
- Session management with refresh tokens
- API key authentication for programmatic access
- Row-level security for all data
- Note-level sharing permissions

#### 9.2 Data Protection
- Encryption at rest (R2) and in transit (TLS)
- GDPR compliance with data export/deletion
- No training on user data
- Isolated vector embeddings per user
- Secure attachment handling

#### 9.3 Rate Limiting
- API rate limits: 100 requests/minute
- AI queries: 50 requests/hour
- Upload limits: 10MB per file, 100MB per note
- Storage quota: 10GB per user

### 10. BlockNote to Markdown Conversion

#### 10.1 Conversion Service
```typescript
// workers/src/services/markdown-converter.ts
export class MarkdownConverter {
  async convertBlocksToMarkdown(blocks: BlockNoteDocument): Promise<string> {
    // Use BlockNote's built-in converter
    const markdown = await blocksToMarkdownLossy(blocks);
    
    // Post-process for better AutoRAG compatibility
    return this.enhanceMarkdownForRAG(markdown);
  }
  
  private enhanceMarkdownForRAG(markdown: string): string {
    // Add metadata headers
    // Ensure proper heading hierarchy
    // Add note links as full URLs
    // Optimize for chunking
    return processedMarkdown;
  }
}
```

#### 10.2 Queue Configuration
```toml
# wrangler.toml
[[queues.producers]]
  queue = "note-processing"
  binding = "NOTE_QUEUE"

[[queues.consumers]]
  queue = "note-processing"
  max_batch_size = 10
  max_batch_timeout = 30
  max_retries = 3
  dead_letter_queue = "note-processing-dlq"
```

### 11. Development Phases

#### Phase 1: MVP (8 weeks)
- BlockNote editor integration
- Basic note CRUD operations
- R2 storage setup
- Queue system for markdown conversion
- AutoRAG configuration
- Simple authentication

#### Phase 2: AI Features (6 weeks)
- RAG chat interface
- Semantic search UI
- Related notes suggestions
- Auto-tagging implementation

#### Phase 3: Enhanced UX (4 weeks)
- Advanced BlockNote customizations
- Folder organization
- Tag management
- Export functionality
- Image handling optimization

#### Phase 4: Collaboration (6 weeks)
- Note sharing
- Public links
- Collaborative editing
- Activity tracking
- Comments system

### 12. Success Metrics

#### 12.1 User Engagement
- Daily Active Users (DAU)
- Average notes created per user per week
- Search queries per user per day
- AI chat interactions per user
- Editor engagement time

#### 12.2 Performance Metrics
- Markdown conversion success rate
- Queue processing time (P50, P95, P99)
- Search result relevance (user feedback)
- AI response accuracy
- System response times

#### 12.3 Business Metrics
- User retention (30-day, 90-day)
- Conversion to paid tier
- Storage utilization
- AI API usage costs
- Infrastructure costs per user

### 13. Risk Mitigation

#### 13.1 Technical Risks
- **Markdown conversion failures**: Implement fallback to basic conversion
- **Queue overload**: Auto-scaling and circuit breakers
- **AutoRAG limitations**: Implement fallback to keyword search
- **BlockNote compatibility**: Maintain version locks, test updates

#### 13.2 User Experience Risks
- **Slow AI responses**: Show loading states and partial results
- **Data loss**: Regular backups, version history
- **Learning curve**: Interactive tutorials, templates
- **Mobile experience**: Progressive enhancement, PWA

### 14. Monitoring & Observability

#### 14.1 Key Metrics to Track
```typescript
// Queue metrics
- Queue depth
- Processing time per note
- Conversion success/failure rates
- Retry counts

// Performance metrics
- API response times
- R2 operation latency
- AutoRAG indexing lag
- Editor save latency

// User metrics
- Feature adoption rates
- Error rates by feature
- User session duration
```

#### 14.2 Alerting Rules
- Queue depth > 1000 items
- Conversion failure rate > 5%
- API error rate > 1%
- AutoRAG indexing lag > 10 minutes

### 15. Future Enhancements

- Mobile native apps with offline sync
- Voice notes with transcription
- Diagram and flowchart blocks
- Math equation blocks
- Code execution blocks
- Integration with external knowledge bases
- Custom AI model fine-tuning
- Multi-language support
- Plugin system for custom blocks
- Desktop app with local-first architecture

### 16. Appendices

#### A. Cloudflare Service Configuration
- R2 bucket: `cloudnotes-{environment}-storage`
- AutoRAG instance: `cloudnotes-rag-{environment}`
- Queue: `note-processing-{environment}`
- Workers: `cloudnotes-api-{environment}`
- D1 database: `cloudnotes-db-{environment}`

#### B. Development Tools
- GitHub repository structure
- CI/CD with GitHub Actions
- Wrangler CLI for deployment
- Miniflare for local development
- Vitest for testing
- BlockNote development setup

#### C. Cost Projections
- R2 Storage: $0.015/GB-month
- Workers: 10M requests @ $0.50/million
- Queues: 1M messages @ $0.40/million
- D1: 5GB @ $5.00/month
- AutoRAG: Usage-based pricing
- Estimated cost per user: $0.50-2.00/month

---

This PRD provides a comprehensive blueprint for building an AI-powered notes application using Cloudflare's ecosystem with BlockNote.js as the editor and server-side markdown processing for optimal performance and user experience.