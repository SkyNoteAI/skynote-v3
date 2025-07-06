import { Hono } from 'hono';
import { Env } from '../types/env';

export const searchRouter = new Hono();

// Input validation for search requests
const validateSearchInput = (query: string, limit: number) => {
  if (!query || typeof query !== 'string') {
    return {
      valid: false,
      error: 'Query is required and must be a string',
    };
  }
  if (query.length < 2) {
    return {
      valid: false,
      error: 'Query must be at least 2 characters long',
    };
  }
  if (query.length > 200) {
    return {
      valid: false,
      error: 'Query must be less than 200 characters',
    };
  }
  if (limit > 50) {
    return {
      valid: false,
      error: 'Limit cannot exceed 50 results',
    };
  }
  return { valid: true };
};

// Helper to extract text excerpt around matches
const extractExcerpt = (
  text: string,
  query: string,
  maxLength: number = 200
): string => {
  if (!text || !query) return '';

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const matchIndex = textLower.indexOf(queryLower);

  if (matchIndex === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, matchIndex - Math.floor(maxLength / 2));
  const end = Math.min(text.length, start + maxLength);

  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt;
};

// Helper to highlight search terms in text
const highlightMatches = (text: string, query: string): string => {
  if (!text || !query) return text;

  const queryWords = query.split(/\s+/).filter((word) => word.length > 0);
  let result = text;

  queryWords.forEach((word) => {
    const regex = new RegExp(`(${word})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });

  return result;
};

// Helper to save search to history
const saveSearchHistory = async (
  env: Env,
  userId: string,
  query: string,
  searchType: 'keyword' | 'semantic',
  resultsCount: number
) => {
  try {
    const historyId = crypto.randomUUID();
    await env.DB.prepare(
      `
      INSERT INTO search_history (id, user_id, query, search_type, results_count, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
    )
      .bind(historyId, userId, query, searchType, resultsCount)
      .run();
  } catch (error) {
    console.warn('Failed to save search history:', error);
  }
};

// GET /api/search - Keyword search
searchRouter.get('/', async (c) => {
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  const query = c.req.query('q') || '';
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);
  const page = Math.max(parseInt(c.req.query('page') || '1'), 1);
  const folder = c.req.query('folder');
  const tag = c.req.query('tag');
  const dateFrom = c.req.query('date_from');
  const dateTo = c.req.query('date_to');

  const validation = validateSearchInput(query, limit);
  if (!validation.valid) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error,
        },
      },
      400
    );
  }

  const offset = (page - 1) * limit;

  try {
    // Build search query using D1's LIKE operator for full-text search
    let searchQuery = `
      SELECT 
        n.id, n.title, n.slug, n.folder_path, n.word_count, n.block_count,
        n.created_at, n.updated_at, n.r2_key_prefix,
        GROUP_CONCAT(t.name) as tags,
        -- Calculate relevance score based on title and content matches
        (CASE WHEN n.title LIKE ? THEN 10 ELSE 0 END) as relevance_score
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.user_id = ? 
        AND n.deleted_at IS NULL
        AND n.title LIKE ?
    `;

    const bindings = [`%${query}%`, userId, `%${query}%`];

    // Add filters
    if (folder) {
      searchQuery += ' AND n.folder_path = ?';
      bindings.push(folder);
    }

    if (tag) {
      searchQuery += ' AND t.name = ?';
      bindings.push(tag);
    }

    if (dateFrom) {
      searchQuery += ' AND n.created_at >= ?';
      bindings.push(dateFrom);
    }

    if (dateTo) {
      searchQuery += ' AND n.created_at <= ?';
      bindings.push(dateTo);
    }

    searchQuery += `
      GROUP BY n.id
      ORDER BY relevance_score DESC, n.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    bindings.push(limit.toString(), offset.toString());

    const { results } = await env.DB.prepare(searchQuery)
      .bind(...bindings)
      .all();

    // Get content excerpts from R2 for each result
    const enhancedResults: any[] = await Promise.all(
      results.map(async (note: any) => {
        let excerpt = '';

        try {
          // Try to get content from R2 for excerpt
          const r2Object = await env.R2.get(
            `${note.r2_key_prefix}/content.json`
          );
          if (r2Object) {
            const content = JSON.parse(await r2Object.text());
            // Extract text content from BlockNote format
            const textContent = content
              .map((block: any) => {
                if (block.content && Array.isArray(block.content)) {
                  return block.content
                    .map((item: any) => item.text || '')
                    .join(' ');
                }
                return '';
              })
              .join(' ');

            excerpt = extractExcerpt(textContent, query);
          }
        } catch (error) {
          // If we can't get content, use title as excerpt
          excerpt = note.title;
        }

        return {
          id: note.id,
          title: highlightMatches(note.title, query),
          slug: note.slug,
          folder: note.folder_path,
          tags: note.tags ? note.tags.split(',') : [],
          excerpt: highlightMatches(excerpt, query),
          wordCount: note.word_count || 0,
          blockCount: note.block_count || 0,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          relevanceScore: note.relevance_score,
        };
      })
    );

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT n.id) as count
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.user_id = ? 
        AND n.deleted_at IS NULL
        AND n.title LIKE ?
    `;

    const countBindings = [userId, `%${query}%`];

    if (folder) {
      countQuery += ' AND n.folder_path = ?';
      countBindings.push(folder);
    }

    if (tag) {
      countQuery += ' AND t.name = ?';
      countBindings.push(tag);
    }

    if (dateFrom) {
      countQuery += ' AND n.created_at >= ?';
      countBindings.push(dateFrom);
    }

    if (dateTo) {
      countQuery += ' AND n.created_at <= ?';
      countBindings.push(dateTo);
    }

    const { results: countResults } = await env.DB.prepare(countQuery)
      .bind(...countBindings)
      .all();

    const totalCount = (countResults[0] as any)?.count || 0;

    // Save search history
    await saveSearchHistory(
      env,
      userId,
      query,
      'keyword',
      enhancedResults.length
    );

    return c.json({
      success: true,
      data: {
        results: enhancedResults,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
        query,
        searchType: 'keyword',
      },
    });
  } catch (error) {
    console.error('Error performing keyword search:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to perform search',
        },
      },
      500
    );
  }
});

// GET /api/search/semantic - Semantic search via AutoRAG
searchRouter.get('/semantic', async (c) => {
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  const query = c.req.query('q') || '';
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);
  const page = Math.max(parseInt(c.req.query('page') || '1'), 1);

  const validation = validateSearchInput(query, limit);
  if (!validation.valid) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error,
        },
      },
      400
    );
  }

  try {
    // Call AutoRAG for semantic search
    const autoragResults = await env.AUTORAG.search({
      query,
      limit: limit * 2, // Get more results to filter by user
      userId,
    });

    // Extract note IDs from AutoRAG results
    const noteIds =
      autoragResults.documents
        ?.map((doc: any) => {
          // Assuming AutoRAG returns document IDs in format: users/{userId}/notes/{noteId}/content.md
          const match = doc.id?.match(
            /users\/[^\/]+\/notes\/([^\/]+)\/content\.md/
          );
          return match ? match[1] : null;
        })
        .filter(Boolean) || [];

    let enhancedResults: any[] = [];

    if (noteIds.length > 0) {
      // Get metadata for these notes from D1
      const placeholders = noteIds.map(() => '?').join(',');
      const metadataQuery = `
        SELECT 
          n.id, n.title, n.slug, n.folder_path, n.word_count, n.block_count,
          n.created_at, n.updated_at, n.r2_key_prefix,
          GROUP_CONCAT(t.name) as tags
        FROM notes n
        LEFT JOIN note_tags nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        WHERE n.id IN (${placeholders})
          AND n.user_id = ?
          AND n.deleted_at IS NULL
        GROUP BY n.id
      `;

      const { results: metadataResults } = await env.DB.prepare(metadataQuery)
        .bind(...noteIds, userId)
        .all();

      // Combine AutoRAG results with metadata
      enhancedResults = metadataResults.map((note: any) => {
        // Find corresponding AutoRAG result for relevance score
        const autoragResult = autoragResults.documents?.find((doc: any) => {
          const match = doc.id?.match(
            /users\/[^\/]+\/notes\/([^\/]+)\/content\.md/
          );
          return match && match[1] === note.id;
        });

        const excerpt = autoragResult?.content || '';
        const relevanceScore = autoragResult?.score || 0;

        return {
          id: note.id,
          title: note.title,
          slug: note.slug,
          folder: note.folder_path,
          tags: note.tags ? note.tags.split(',') : [],
          excerpt: highlightMatches(excerpt, query),
          wordCount: note.word_count || 0,
          blockCount: note.block_count || 0,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          relevanceScore,
        };
      });

      // Sort by relevance score
      enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = enhancedResults.slice(
      startIndex,
      startIndex + limit
    );

    // Save search history
    await saveSearchHistory(
      env,
      userId,
      query,
      'semantic',
      enhancedResults.length
    );

    return c.json({
      success: true,
      data: {
        results: paginatedResults,
        pagination: {
          page,
          limit,
          totalCount: enhancedResults.length,
          totalPages: Math.ceil(enhancedResults.length / limit),
          hasNext: startIndex + limit < enhancedResults.length,
          hasPrev: page > 1,
        },
        query,
        searchType: 'semantic',
      },
    });
  } catch (error) {
    console.error('Error performing semantic search:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'SEMANTIC_SEARCH_ERROR',
          message: 'Failed to perform semantic search',
        },
      },
      500
    );
  }
});

// GET /api/search/similar/:id - Find similar notes
searchRouter.get('/similar/:id', async (c) => {
  const noteId = c.req.param('id');
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  const limit = Math.min(parseInt(c.req.query('limit') || '5'), 20);

  try {
    // First, get the note to ensure it exists and belongs to the user
    const note = await env.DB.prepare(
      `
      SELECT id, title, r2_key_prefix FROM notes 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
      `
    )
      .bind(noteId, userId)
      .first();

    if (!note) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOTE_NOT_FOUND',
            message: 'Note not found',
          },
        },
        404
      );
    }

    // Get the note's content to use as search query
    let searchQuery = (note as any).title;

    try {
      const r2Object = await env.R2.get(
        `${(note as any).r2_key_prefix}/content.json`
      );
      if (r2Object) {
        const content = JSON.parse(await r2Object.text());
        const textContent = content
          .map((block: any) => {
            if (block.content && Array.isArray(block.content)) {
              return block.content
                .map((item: any) => item.text || '')
                .join(' ');
            }
            return '';
          })
          .join(' ');

        // Use first 500 characters as search query
        searchQuery = textContent.slice(0, 500);
      }
    } catch (error) {
      console.warn('Failed to get content for similarity search:', error);
    }

    // Use AutoRAG to find similar content
    const autoragResults = await env.AUTORAG.search({
      query: searchQuery,
      limit: limit * 2, // Get more results to filter
      userId,
    });

    // Extract note IDs and filter out the original note
    const noteIds =
      autoragResults.documents
        ?.map((doc: any) => {
          const match = doc.id?.match(
            /users\/[^\/]+\/notes\/([^\/]+)\/content\.md/
          );
          return match ? match[1] : null;
        })
        .filter(Boolean)
        .filter((id: string) => id !== noteId) || [];

    let similarNotes: any[] = [];

    if (noteIds.length > 0) {
      // Get metadata for similar notes
      const placeholders = noteIds.map(() => '?').join(',');
      const metadataQuery = `
        SELECT 
          n.id, n.title, n.slug, n.folder_path, n.word_count, n.block_count,
          n.created_at, n.updated_at,
          GROUP_CONCAT(t.name) as tags
        FROM notes n
        LEFT JOIN note_tags nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        WHERE n.id IN (${placeholders})
          AND n.user_id = ?
          AND n.deleted_at IS NULL
        GROUP BY n.id
      `;

      const { results: metadataResults } = await env.DB.prepare(metadataQuery)
        .bind(...noteIds, userId)
        .all();

      // Combine with AutoRAG scores
      similarNotes = metadataResults.map((similarNote: any) => {
        const autoragResult = autoragResults.documents?.find((doc: any) => {
          const match = doc.id?.match(
            /users\/[^\/]+\/notes\/([^\/]+)\/content\.md/
          );
          return match && match[1] === similarNote.id;
        });

        return {
          id: similarNote.id,
          title: similarNote.title,
          slug: similarNote.slug,
          folder: similarNote.folder_path,
          tags: similarNote.tags ? similarNote.tags.split(',') : [],
          wordCount: similarNote.word_count || 0,
          blockCount: similarNote.block_count || 0,
          createdAt: similarNote.created_at,
          updatedAt: similarNote.updated_at,
          similarityScore: autoragResult?.score || 0,
        };
      });

      // Sort by similarity score and limit
      similarNotes.sort((a, b) => b.similarityScore - a.similarityScore);
      similarNotes = similarNotes.slice(0, limit);
    }

    return c.json({
      success: true,
      data: {
        originalNote: {
          id: (note as any).id,
          title: (note as any).title,
        },
        similarNotes,
        totalCount: similarNotes.length,
      },
    });
  } catch (error) {
    console.error('Error finding similar notes:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'SIMILAR_SEARCH_ERROR',
          message: 'Failed to find similar notes',
        },
      },
      500
    );
  }
});

// GET /api/search/history - Get search history
searchRouter.get('/history', async (c) => {
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const page = Math.max(parseInt(c.req.query('page') || '1'), 1);
  const offset = (page - 1) * limit;

  try {
    const { results } = await env.DB.prepare(
      `
      SELECT id, query, search_type, results_count, created_at
      FROM search_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `
    )
      .bind(userId, limit, offset)
      .all();

    const { results: countResults } = await env.DB.prepare(
      `
      SELECT COUNT(*) as count
      FROM search_history
      WHERE user_id = ?
      `
    )
      .bind(userId)
      .all();

    const totalCount = (countResults[0] as any)?.count || 0;

    return c.json({
      success: true,
      data: {
        history: results,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'SEARCH_HISTORY_ERROR',
          message: 'Failed to fetch search history',
        },
      },
      500
    );
  }
});
