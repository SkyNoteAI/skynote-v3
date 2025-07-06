import { Hono } from 'hono';
import { Env, NoteMessage } from '../types/env';
import { HonoEnv } from '../types/hono';

export const notesRouter = new Hono();

// Input validation schemas
const validateNoteInput = (data: any) => {
  if (
    !data.title ||
    typeof data.title !== 'string' ||
    data.title.length > 200
  ) {
    return {
      valid: false,
      error: 'Title is required and must be less than 200 characters',
    };
  }
  if (data.content && typeof data.content !== 'object') {
    return { valid: false, error: 'Content must be a valid JSON object' };
  }
  if (data.folder && typeof data.folder !== 'string') {
    return { valid: false, error: 'Folder must be a string' };
  }
  if (
    data.tags &&
    (!Array.isArray(data.tags) ||
      data.tags.some((tag: any) => typeof tag !== 'string'))
  ) {
    return { valid: false, error: 'Tags must be an array of strings' };
  }
  return { valid: true };
};

// Helper to generate R2 key
const generateR2Key = (userId: string, noteId: string) =>
  `users/${userId}/notes/${noteId}`;

// Helper to count words and blocks
const countContent = (content: any) => {
  if (!content || !Array.isArray(content))
    return { wordCount: 0, blockCount: 0 };

  let wordCount = 0;
  let blockCount = content.length;

  content.forEach((block: any) => {
    if (block.content && Array.isArray(block.content)) {
      block.content.forEach((item: any) => {
        if (item.text && typeof item.text === 'string') {
          wordCount += item.text
            .split(/\s+/)
            .filter((word: string) => word.length > 0).length;
        }
      });
    }
  });

  return { wordCount, blockCount };
};

// GET /api/notes - List notes with pagination
notesRouter.get('/', async (c) => {
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  // Parse query parameters
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const folder = c.req.query('folder');
  const tag = c.req.query('tag');
  const search = c.req.query('search');
  const sort = c.req.query('sort') || 'updated_at';
  const order = c.req.query('order') || 'desc';
  const includeDeleted = c.req.query('include_deleted') === 'true';

  const offset = (page - 1) * limit;

  try {
    // Build query
    let query = `
      SELECT 
        n.id, n.title, n.slug, n.folder_path, n.r2_key_prefix,
        n.word_count, n.block_count, n.has_images, n.markdown_generated_at,
        n.created_at, n.updated_at, n.deleted_at,
        GROUP_CONCAT(t.name) as tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.user_id = ?
    `;

    const bindings = [userId];

    if (!includeDeleted) {
      query += ' AND n.deleted_at IS NULL';
    }

    if (folder) {
      query += ' AND n.folder_path = ?';
      bindings.push(folder);
    }

    if (search) {
      query += ' AND n.title LIKE ?';
      bindings.push(`%${search}%`);
    }

    if (tag) {
      query += ' AND t.name = ?';
      bindings.push(tag);
    }

    query += ' GROUP BY n.id';

    // Add sorting
    const validSorts = ['title', 'created_at', 'updated_at', 'word_count'];
    const validOrders = ['asc', 'desc'];
    if (validSorts.includes(sort) && validOrders.includes(order)) {
      query += ` ORDER BY n.${sort} ${order.toUpperCase()}`;
    }

    query += ' LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    // Execute query
    const { results } = await env.DB.prepare(query)
      .bind(...bindings)
      .all();

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM notes WHERE user_id = ?`;
    const countBindings = [userId];

    if (!includeDeleted) {
      countQuery += ' AND deleted_at IS NULL';
    }

    const { results: countResults } = await env.DB.prepare(countQuery)
      .bind(...countBindings)
      .all();
    const totalCount = (countResults[0] as any)?.count || 0;

    // Format results
    const notes = results.map((note: any) => ({
      id: note.id,
      title: note.title,
      slug: note.slug,
      folder: note.folder_path,
      tags: note.tags ? note.tags.split(',') : [],
      wordCount: note.word_count || 0,
      blockCount: note.block_count || 0,
      hasImages: !!note.has_images,
      markdownGenerated: !!note.markdown_generated_at,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      deletedAt: note.deleted_at,
    }));

    return c.json({
      success: true,
      data: {
        notes,
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
    console.error('Error fetching notes:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_NOTES_ERROR',
          message: 'Failed to fetch notes',
        },
      },
      500
    );
  }
});

// POST /api/notes - Create new note
notesRouter.post('/', async (c) => {
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  try {
    const body = await c.req.json();

    // Validate input
    const validation = validateNoteInput(body);
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

    const noteId = crypto.randomUUID();
    const { title, content = [], folder = null, tags = [] } = body;
    const r2KeyPrefix = generateR2Key(userId, noteId);
    const { wordCount, blockCount } = countContent(content);

    // Create note in database
    await env.DB.prepare(
      `
      INSERT INTO notes (
        id, user_id, title, folder_path, r2_key_prefix, 
        word_count, block_count, has_images, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    )
      .bind(
        noteId,
        userId,
        title,
        folder,
        r2KeyPrefix,
        wordCount,
        blockCount,
        false
      )
      .run();

    // Handle tags
    if (tags.length > 0) {
      for (const tagName of tags) {
        // Insert or get tag
        const tagId = crypto.randomUUID();
        await env.DB.prepare(
          `
          INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)
        `
        )
          .bind(tagId, tagName)
          .run();

        // Get tag ID
        const tag = await env.DB.prepare(`SELECT id FROM tags WHERE name = ?`)
          .bind(tagName)
          .first();

        // Link tag to note
        if (tag) {
          await env.DB.prepare(
            `
            INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)
          `
          )
            .bind(noteId, (tag as any).id)
            .run();
        }
      }
    }

    // Save content to R2
    if (content.length > 0) {
      await env.R2.put(`${r2KeyPrefix}/content.json`, JSON.stringify(content), {
        httpMetadata: {
          contentType: 'application/json',
        },
      });

      // Queue markdown conversion
      const message: NoteMessage = {
        type: 'convert-to-markdown',
        noteId,
        userId,
        content,
        title,
        metadata: {
          tags,
          folder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      await env.NOTE_QUEUE.send(message);
    }

    return c.json({
      success: true,
      data: {
        noteId,
        title,
        folder,
        tags,
        wordCount,
        blockCount,
      },
    });
  } catch (error) {
    console.error('Error creating note:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'CREATE_NOTE_ERROR',
          message: 'Failed to create note',
        },
      },
      500
    );
  }
});

// GET /api/notes/:id - Get single note
notesRouter.get('/:id', async (c) => {
  const noteId = c.req.param('id');
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  try {
    // Get note metadata
    const note = await env.DB.prepare(
      `
      SELECT 
        n.id, n.title, n.slug, n.folder_path, n.r2_key_prefix,
        n.word_count, n.block_count, n.has_images, n.markdown_generated_at,
        n.created_at, n.updated_at, n.deleted_at,
        GROUP_CONCAT(t.name) as tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.id = ? AND n.user_id = ?
      GROUP BY n.id
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

    // Get content from R2
    let content = [];
    try {
      const r2Object = await env.R2.get(`${note.r2_key_prefix}/content.json`);
      if (r2Object) {
        content = JSON.parse(await r2Object.text());
      }
    } catch (r2Error) {
      console.warn('Failed to fetch content from R2:', r2Error);
    }

    return c.json({
      success: true,
      data: {
        id: (note as any).id,
        title: (note as any).title,
        slug: (note as any).slug,
        folder: (note as any).folder_path,
        tags: (note as any).tags ? (note as any).tags.split(',') : [],
        content,
        wordCount: (note as any).word_count || 0,
        blockCount: (note as any).block_count || 0,
        hasImages: !!(note as any).has_images,
        markdownGenerated: !!(note as any).markdown_generated_at,
        createdAt: (note as any).created_at,
        updatedAt: (note as any).updated_at,
        deletedAt: (note as any).deleted_at,
      },
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_NOTE_ERROR',
          message: 'Failed to fetch note',
        },
      },
      500
    );
  }
});

// PUT /api/notes/:id - Update note
notesRouter.put('/:id', async (c) => {
  const noteId = c.req.param('id');
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  try {
    const body = await c.req.json();

    // Validate input
    const validation = validateNoteInput(body);
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

    // Check if note exists and belongs to user
    const existingNote = await env.DB.prepare(
      `
      SELECT id, r2_key_prefix FROM notes WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `
    )
      .bind(noteId, userId)
      .first();

    if (!existingNote) {
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

    const { title, content, folder = null, tags = [] } = body;
    const { wordCount, blockCount } = countContent(content);

    // Update note metadata
    await env.DB.prepare(
      `
      UPDATE notes 
      SET title = ?, folder_path = ?, word_count = ?, block_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `
    )
      .bind(title, folder, wordCount, blockCount, noteId, userId)
      .run();

    // Update tags - remove all existing tags first
    await env.DB.prepare(`DELETE FROM note_tags WHERE note_id = ?`)
      .bind(noteId)
      .run();

    // Add new tags
    if (tags.length > 0) {
      for (const tagName of tags) {
        const tagId = crypto.randomUUID();
        await env.DB.prepare(
          `
          INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)
        `
        )
          .bind(tagId, tagName)
          .run();

        const tag = await env.DB.prepare(`SELECT id FROM tags WHERE name = ?`)
          .bind(tagName)
          .first();

        if (tag) {
          await env.DB.prepare(
            `
            INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)
          `
          )
            .bind(noteId, (tag as any).id)
            .run();
        }
      }
    }

    // Save content to R2
    if (content) {
      await env.R2.put(
        `${existingNote.r2_key_prefix}/content.json`,
        JSON.stringify(content),
        {
          httpMetadata: {
            contentType: 'application/json',
          },
        }
      );

      // Queue markdown conversion
      const message: NoteMessage = {
        type: 'convert-to-markdown',
        noteId,
        userId,
        content,
        title,
        metadata: {
          tags,
          folder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      await env.NOTE_QUEUE.send(message);
    }

    return c.json({
      success: true,
      data: {
        noteId,
        title,
        folder,
        tags,
        wordCount,
        blockCount,
      },
    });
  } catch (error) {
    console.error('Error updating note:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'UPDATE_NOTE_ERROR',
          message: 'Failed to update note',
        },
      },
      500
    );
  }
});

// DELETE /api/notes/:id - Soft delete note
notesRouter.delete('/:id', async (c) => {
  const noteId = c.req.param('id');
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  try {
    // Check if note exists and belongs to user
    const note = await env.DB.prepare(
      `
      SELECT id FROM notes WHERE id = ? AND user_id = ? AND deleted_at IS NULL
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

    // Soft delete (set deleted_at timestamp)
    await env.DB.prepare(
      `
      UPDATE notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?
    `
    )
      .bind(noteId, userId)
      .run();

    return c.json({
      success: true,
      data: {
        noteId,
        message: 'Note deleted successfully',
      },
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'DELETE_NOTE_ERROR',
          message: 'Failed to delete note',
        },
      },
      500
    );
  }
});

// POST /api/notes/:id/restore - Restore deleted note
notesRouter.post('/:id/restore', async (c) => {
  const noteId = c.req.param('id');
  const userId = (c as any).get('userId') as string;
  const env = c.env as unknown as Env;

  try {
    // Check if note exists, belongs to user, and is deleted
    const note = await env.DB.prepare(
      `
      SELECT id FROM notes WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL
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
            message: 'Deleted note not found',
          },
        },
        404
      );
    }

    // Restore note (clear deleted_at timestamp)
    await env.DB.prepare(
      `
      UPDATE notes SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?
    `
    )
      .bind(noteId, userId)
      .run();

    return c.json({
      success: true,
      data: {
        noteId,
        message: 'Note restored successfully',
      },
    });
  } catch (error) {
    console.error('Error restoring note:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'RESTORE_NOTE_ERROR',
          message: 'Failed to restore note',
        },
      },
      500
    );
  }
});
