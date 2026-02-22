import { z } from 'zod';

/** Validate and throw a structured error if input doesn't match schema */
export function validate<T>(schema: z.Schema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const err = new Error(message) as Error & { status: number };
    err.status = 400;
    throw err;
  }
  return result.data;
}
