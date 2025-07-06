export interface Env {
  // Database
  DB: D1Database;

  // Storage
  R2: R2Bucket;

  // Queue
  NOTE_QUEUE: Queue<NoteMessage>;

  // AI
  AI: Ai;
  AUTORAG: {
    search: (params: {
      query: string;
      limit: number;
      userId: string;
    }) => Promise<any>;
    getContext: (params: {
      query: string;
      limit: number;
      userId: string;
    }) => Promise<any>;
  };

  // Environment variables
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS?: string;

  // Authentication
  CLOUDFLARE_ACCESS_AUD?: string;
  CLOUDFLARE_ACCESS_DOMAIN?: string;
  OAUTH_GOOGLE_CLIENT_ID?: string;
  OAUTH_GOOGLE_CLIENT_SECRET?: string;

  // Rate limiting
  RATE_LIMITER: DurableObjectNamespace;
}

// BlockNote content type - simplified for now, can be expanded with proper BlockNote types
export interface BlockNoteContent {
  type: string;
  content?: BlockNoteContent[];
  attrs?: Record<string, unknown>;
  text?: string;
}

export interface NoteMessage {
  type: 'convert-to-markdown' | 'index-for-search';
  noteId: string;
  userId: string;
  content: BlockNoteContent[];
  title?: string;
  metadata?: {
    tags: string[];
    folder?: string;
    created_at: string;
    updated_at: string;
  };
}

// Cloudflare Workers queue types
export interface Message<T = unknown> {
  id: string;
  body: T;
  attempts: number;
  timestamp: Date;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

export interface MessageBatch<T = unknown> {
  messages: Message<T>[];
  queue: string;
  retryAll(): void;
  ackAll(): void;
}
