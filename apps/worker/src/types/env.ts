/* eslint-disable no-undef */
export interface Env {
  // Database
  DB: D1Database;

  // Storage
  R2: R2Bucket;

  // Queue
  NOTE_QUEUE: Queue;

  // AI
  AI: Ai;
  AUTORAG: any; // AutoRAG service binding

  // Environment variables
  JWT_SECRET: string;
  ENVIRONMENT: string;

  // Rate limiting
  RATE_LIMITER: DurableObjectNamespace;
}

export interface NoteMessage {
  type: 'convert-to-markdown' | 'index-for-search';
  noteId: string;
  userId: string;
  content: any;
  title?: string;
  metadata?: {
    tags: string[];
    folder?: string;
    created_at: string;
    updated_at: string;
  };
}
