/**
 * Tests for Zod validation utility
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate } from '../../src/utils/validate.js';

describe('validate utility', () => {
  const testSchema = z.object({
    name: z.string().min(1).max(100),
    age: z.number().int().min(0).max(200),
    email: z.string().email(),
  });

  it('should return parsed data for valid input', () => {
    const input = { name: 'Alice', age: 30, email: 'alice@example.com' };
    const result = validate(testSchema, input);
    expect(result).toEqual(input);
  });

  it('should throw with status 400 for invalid input', () => {
    try {
      validate(testSchema, { name: '', age: -1, email: 'not-an-email' });
      expect.unreachable('should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.message).toBeTruthy();
    }
  });

  it('should include field path in error message', () => {
    try {
      validate(testSchema, { name: 'OK', age: 'not-a-number', email: 'valid@email.com' });
      expect.unreachable('should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('age');
    }
  });

  it('should handle missing required fields', () => {
    try {
      validate(testSchema, {});
      expect.unreachable('should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.message).toContain('name');
    }
  });

  it('should handle extra fields by stripping them', () => {
    const input = { name: 'Bob', age: 25, email: 'bob@test.com', extra: 'ignored' };
    const result = validate(testSchema, input);
    expect(result.name).toBe('Bob');
  });

  it('should validate nested schemas', () => {
    const nestedSchema = z.object({
      user: z.object({
        username: z.string().min(3),
      }),
    });

    const result = validate(nestedSchema, { user: { username: 'alice' } });
    expect(result.user.username).toBe('alice');
  });

  it('should validate with default values', () => {
    const withDefaults = z.object({
      name: z.string(),
      role: z.string().default('user'),
    });

    const result = validate(withDefaults, { name: 'Alice' });
    expect(result.role).toBe('user');
  });

  it('should validate enums', () => {
    const enumSchema = z.object({
      status: z.enum(['open', 'closed', 'pending']),
    });

    const result = validate(enumSchema, { status: 'open' });
    expect(result.status).toBe('open');

    expect(() => validate(enumSchema, { status: 'invalid' })).toThrow();
  });

  it('should validate regex patterns', () => {
    const slugSchema = z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
    });

    expect(validate(slugSchema, { slug: 'my-page-123' }).slug).toBe('my-page-123');
    expect(() => validate(slugSchema, { slug: 'Invalid Slug!' })).toThrow();
  });

  it('should validate string length constraints', () => {
    const schema = z.object({
      password: z.string().min(8).max(128),
    });

    expect(() => validate(schema, { password: 'short' })).toThrow();
    expect(validate(schema, { password: '12345678' }).password).toBe('12345678');
  });
});
