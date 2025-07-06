import type { Env } from '../types/env';

export interface AutoRAGSource {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  metadata?: {
    folder?: string;
    tags?: string[];
    created_at: string;
    updated_at: string;
  };
}

export interface AutoRAGContext {
  sources: AutoRAGSource[];
  query: string;
  total_results: number;
}

export interface AutoRAGSearchParams {
  query: string;
  limit: number;
  userId: string;
  threshold?: number;
}

export class AutoRAGService {
  constructor(private env: Env) {}

  async search(params: AutoRAGSearchParams): Promise<AutoRAGContext> {
    // For now, this is a mock implementation
    // In production, this would call the actual AutoRAG API
    return this.mockSearch(params);
  }

  async getContext(params: AutoRAGSearchParams): Promise<AutoRAGContext> {
    // This method retrieves context for chat conversations
    // It's similar to search but optimized for RAG
    return this.mockSearch(params);
  }

  private async mockSearch(
    params: AutoRAGSearchParams
  ): Promise<AutoRAGContext> {
    const { query, limit, userId, threshold = 0.5 } = params;

    try {
      // Mock implementation: Search through notes using keyword search
      // In production, this would be replaced with actual AutoRAG calls
      const searchResults = await this.env.DB.prepare(
        `
        SELECT 
          n.id,
          n.title,
          n.folder_path,
          n.created_at,
          n.updated_at,
          n.r2_key_prefix,
          GROUP_CONCAT(t.name) as tags
        FROM notes n
        LEFT JOIN note_tags nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        WHERE n.user_id = ? 
          AND n.deleted_at IS NULL
          AND (
            n.title LIKE ? OR
            EXISTS (
              SELECT 1 FROM search_history sh 
              WHERE sh.user_id = n.user_id 
              AND sh.query LIKE ?
            )
          )
        GROUP BY n.id, n.title, n.folder_path, n.created_at, n.updated_at, n.r2_key_prefix
        ORDER BY n.updated_at DESC
        LIMIT ?
      `
      )
        .bind(userId, `%${query}%`, `%${query}%`, limit)
        .all();

      const sources: AutoRAGSource[] = [];

      for (const note of searchResults.results) {
        try {
          // Try to fetch a snippet from R2
          const contentKey = `${note.r2_key_prefix}/content.md`;
          const content = await this.env.R2.get(contentKey);

          let excerpt = 'No content preview available';
          if (content) {
            const text = await content.text();
            // Extract relevant excerpt (simplified)
            excerpt = this.extractExcerpt(text, query, 200);
          }

          // Calculate mock relevance score
          const score = this.calculateRelevanceScore(
            note.title,
            query,
            excerpt
          );

          if (score >= threshold) {
            sources.push({
              id: note.id,
              title: note.title,
              excerpt,
              score,
              metadata: {
                folder: note.folder_path,
                tags: note.tags ? note.tags.split(',') : [],
                created_at: note.created_at,
                updated_at: note.updated_at,
              },
            });
          }
        } catch (error) {
          // If we can't fetch content, still include the note with title only
          sources.push({
            id: note.id,
            title: note.title,
            excerpt: `Content from note: ${note.title}`,
            score: 0.3,
            metadata: {
              folder: note.folder_path,
              tags: note.tags ? note.tags.split(',') : [],
              created_at: note.created_at,
              updated_at: note.updated_at,
            },
          });
        }
      }

      // Sort by relevance score
      sources.sort((a, b) => b.score - a.score);

      return {
        sources: sources.slice(0, limit),
        query,
        total_results: sources.length,
      };
    } catch (error) {
      console.error('AutoRAG search error:', error);
      return {
        sources: [],
        query,
        total_results: 0,
      };
    }
  }

  private extractExcerpt(
    text: string,
    query: string,
    maxLength: number
  ): string {
    if (!text) return 'No content available';

    // Remove markdown headers and frontmatter
    const cleanText = text
      .replace(/^---[\s\S]*?---\n/m, '') // Remove frontmatter
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italics
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .trim();

    // Try to find the query in the text
    const lowerText = cleanText.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryIndex = lowerText.indexOf(lowerQuery);

    if (queryIndex !== -1) {
      // Extract around the query
      const start = Math.max(0, queryIndex - 100);
      const end = Math.min(cleanText.length, queryIndex + query.length + 100);
      let excerpt = cleanText.substring(start, end);

      if (start > 0) excerpt = '...' + excerpt;
      if (end < cleanText.length) excerpt = excerpt + '...';

      return excerpt;
    }

    // If query not found, return first part of text
    return cleanText.length > maxLength
      ? cleanText.substring(0, maxLength) + '...'
      : cleanText;
  }

  private calculateRelevanceScore(
    title: string,
    query: string,
    excerpt: string
  ): number {
    const lowerTitle = title.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const lowerExcerpt = excerpt.toLowerCase();

    let score = 0;

    // Title exact match
    if (lowerTitle === lowerQuery) {
      score += 1.0;
    }
    // Title contains query
    else if (lowerTitle.includes(lowerQuery)) {
      score += 0.8;
    }
    // Title contains query words
    else {
      const queryWords = lowerQuery.split(/\s+/);
      const titleWords = lowerTitle.split(/\s+/);
      const matches = queryWords.filter((word) => titleWords.includes(word));
      score += (matches.length / queryWords.length) * 0.6;
    }

    // Excerpt contains query
    if (lowerExcerpt.includes(lowerQuery)) {
      score += 0.4;
    }
    // Excerpt contains query words
    else {
      const queryWords = lowerQuery.split(/\s+/);
      const excerptWords = lowerExcerpt.split(/\s+/);
      const matches = queryWords.filter((word) => excerptWords.includes(word));
      score += (matches.length / queryWords.length) * 0.2;
    }

    // Normalize to 0-1 range
    return Math.min(1.0, Math.max(0.0, score));
  }
}
