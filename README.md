# SkyNote AI

An AI-powered notes application built with Cloudflare's ecosystem, featuring intelligent search, content discovery, and conversational interactions with your personal knowledge base.

## ✨ Features

- **Rich Text Editor**: Notion-style block editor powered by BlockNote.js
- **AI-Powered Search**: Semantic search using Cloudflare AutoRAG
- **Conversational AI**: Chat with your notes using RAG-powered responses
- **Real-time Sync**: Instant synchronization across all devices
- **Smart Organization**: Auto-tagging and intelligent folder management
- **Offline Support**: Works offline with seamless sync when online

## 🏗️ Architecture

- **Frontend**: React 18+ with TypeScript, TailwindCSS, and Shadcn/ui
- **Backend**: Cloudflare Workers for serverless API
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Storage**: Cloudflare R2 for file and content storage
- **AI/RAG**: Cloudflare AutoRAG + Workers AI
- **Queue**: Cloudflare Queues for background processing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Cloudflare account with access to:
  - Workers
  - D1 Database
  - R2 Storage
  - Queues
  - AutoRAG

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skynote-ai
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Cloudflare credentials
   ```

4. **Initialize the database**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Start development servers**
   ```bash
   # Start all services
   pnpm dev

   # Or start individually
   pnpm dev:web     # Frontend only
   pnpm dev:worker  # Backend only
   ```

## 📁 Project Structure

```
skynote-ai/
├── apps/
│   ├── web/                 # React frontend application
│   └── worker/              # Cloudflare Worker backend
├── packages/
│   ├── shared/              # Shared types and utilities
│   ├── database/            # D1 schema and migrations
│   └── ui/                  # Shared UI components
├── .github/
│   └── workflows/           # CI/CD pipelines
├── docs/                    # Documentation
├── scripts/                 # Build and deployment scripts
├── PRD.md                   # Product Requirements Document
├── TASKS.md                 # Development tasks and progress
└── CLAUDE.md                # AI assistant guide
```

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start all services in development mode
pnpm dev:web          # Start frontend only
pnpm dev:worker       # Start backend only

# Building
pnpm build            # Build all packages
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix linting issues

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests
pnpm test:e2e         # Run E2E tests

# Database
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed development data

# Deployment
pnpm deploy:dev       # Deploy to development
pnpm deploy:prod      # Deploy to production
```

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Cloudflare
CF_ACCOUNT_ID=your-account-id
CF_API_TOKEN=your-api-token

# R2 Storage
R2_BUCKET_NAME=cloudnotes-dev-storage

# D1 Database
D1_DATABASE_ID=your-database-id

# AutoRAG
AUTORAG_INSTANCE_ID=your-autorag-id

# Queues
QUEUE_NAME=note-processing-dev
```

## 🚢 Deployment

### Development Environment

```bash
pnpm deploy:dev
```

### Production Environment

```bash
pnpm deploy:prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 Documentation

- [Product Requirements Document](./PRD.md) - Complete product specification
- [Development Tasks](./TASKS.md) - Detailed task breakdown and progress
- [AI Assistant Guide](./CLAUDE.md) - Guide for AI development assistance

## 📊 Development Progress

Current development is organized into 5 phases:

1. **Foundation** (Week 1-2): Infrastructure and project setup
2. **Core Features** (Week 3-4): CRUD operations and editor
3. **Advanced Features** (Week 5-6): Search and AI chat
4. **AI Integration** (Week 7): AutoRAG and smart features
5. **Polish & Launch** (Week 8): Testing and deployment

See [TASKS.md](./TASKS.md) for detailed progress tracking.

## 🛠️ Tech Stack

### Frontend
- React 18+ with TypeScript
- BlockNote.js for rich text editing
- TailwindCSS + Shadcn/ui for styling
- Zustand for state management
- TanStack Query for data fetching

### Backend
- Cloudflare Workers for serverless functions
- Hono.js for routing and middleware
- Cloudflare D1 for database
- Cloudflare R2 for storage
- Cloudflare Queues for background jobs

### AI & Search
- Cloudflare AutoRAG for semantic search
- Cloudflare Workers AI for chat responses
- Vector embeddings for content similarity

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please check the [troubleshooting guide](./docs/troubleshooting.md) or open an issue in the GitHub repository.

---

Built with ❤️ using Cloudflare's edge computing platform.