import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseError } from '../utils/errors';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * SQLite データベース接続を作成し、マイグレーションを実行する
 */
export const createConnection = (dbPath: string): DatabaseSync => {
  try {
    const db = new DatabaseSync(dbPath);

    // 外部キー制約を有効化
    db.exec('PRAGMA foreign_keys = ON');

    // マイグレーション実行
    runMigrations(db);

    return db;
  } catch {
    throw new DatabaseError('Failed to create database connection');
  }
};

/**
 * マイグレーションを実行する
 */
const runMigrations = (db: DatabaseSync): void => {
  const migrationPath = resolve(
    __dirname,
    './migrations/001-initial-schema.sql',
  );

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    db.exec(sql);
  } catch {
    throw new DatabaseError('Failed to run database migrations');
  }
};

/**
 * データベース接続をクローズする
 */
export const closeConnection = (db: DatabaseSync): void => {
  try {
    db.close();
  } catch {
    throw new DatabaseError('Failed to close database connection');
  }
};
