import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createConnection, closeConnection } from '../../src/database';

describe('Database Connection', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createConnection(':memory:');
  });

  afterEach(() => {
    closeConnection(db);
  });

  it('should create database connection and run migrations', () => {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('secrets');
    expect(tableNames).toContain('tokens');
  });

  it('should enable foreign keys', () => {
    const result = db.prepare('PRAGMA foreign_keys').get() as {
      foreign_keys: number;
    };
    expect(result.foreign_keys).toBe(1);
  });
});
