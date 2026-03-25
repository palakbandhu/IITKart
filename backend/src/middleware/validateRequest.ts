import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

/**
 * Validate req.body against a Zod schema.
 * On failure, returns 400 with detailed field errors.
 * On success, replaces req.body with the parsed (and coerced) value.
 */
export const validateRequest =
  (schema: ZodType<any, any, any>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Swapped .errors for .issues here to keep TypeScript happy
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }
    req.body = result.data;
    next();
  };