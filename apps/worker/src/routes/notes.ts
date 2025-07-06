import { Hono } from 'hono';

export const notesRouter = new Hono();

// Placeholder routes for notes API
notesRouter.get('/', async (c) => {
  return c.json({
    success: true,
    data: {
      message: 'Notes API endpoint - GET /api/notes',
      notes: [],
    },
  });
});

notesRouter.post('/', async (c) => {
  return c.json({
    success: true,
    data: {
      message: 'Notes API endpoint - POST /api/notes',
      noteId: crypto.randomUUID(),
    },
  });
});

notesRouter.get('/:id', async (c) => {
  const noteId = c.req.param('id');
  return c.json({
    success: true,
    data: {
      message: `Notes API endpoint - GET /api/notes/${noteId}`,
      noteId,
    },
  });
});

notesRouter.put('/:id', async (c) => {
  const noteId = c.req.param('id');
  return c.json({
    success: true,
    data: {
      message: `Notes API endpoint - PUT /api/notes/${noteId}`,
      noteId,
    },
  });
});

notesRouter.delete('/:id', async (c) => {
  const noteId = c.req.param('id');
  return c.json({
    success: true,
    data: {
      message: `Notes API endpoint - DELETE /api/notes/${noteId}`,
      noteId,
    },
  });
});
