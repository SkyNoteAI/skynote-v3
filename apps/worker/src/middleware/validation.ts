import { Context, Next } from 'hono';
import { z, ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);

      // Store validated data in context
      c.set('validatedData', validatedData);

      // Override req.valid to return our validated data
      c.req.valid = () => validatedData;

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          error: {
            code: 'REQUEST_PARSE_ERROR',
            message: 'Failed to parse request body',
          },
        },
        400
      );
    }
  };
};
