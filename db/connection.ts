import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

let dbConnection: Database | null = null;

function dbPath() {
  return process.env.DB_PATH || './DATA.sqlite';
}

async function openConnection(): Promise<Database> {
  const conn = await open({ filename: dbPath(), driver: sqlite3.Database });
  await conn.exec('PRAGMA foreign_keys = ON;');
  await conn.exec('PRAGMA busy_timeout = 5000;');
  return conn;
}

export async function getDb(): Promise<Database> {
  if (!dbConnection) dbConnection = await openConnection();
  return dbConnection;
}

/**
 * Runs `fn` inside its own transaction on its own connection.
 * The shared connection from getDb() never sees half-done work, and a
 * rollback here cannot undo writes made by other requests.
 * SQLite allows one writer at a time; other writers wait (busy_timeout).
 */
export async function withTransaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const conn = await openConnection();
  try {
    await conn.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(conn);
      await conn.exec('COMMIT');
      return result;
    } catch (error) {
      await conn.exec('ROLLBACK');
      throw error;
    }
  } finally {
    await conn.close();
  }
}

export async function closeDb() {
  if (dbConnection) {
    await dbConnection.close();
    dbConnection = null;
    console.log('Database connection closed.');
  }
}
