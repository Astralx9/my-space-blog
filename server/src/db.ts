import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolClient } from 'pg';
import type { AppConfig } from './config.js';

export const createPool = (config: AppConfig) => new Pool({ connectionString: config.databaseUrl });

export const withTransaction = async <T>(pool: Pool, work: (client: PoolClient) => Promise<T>) => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

export const runMigrations = async (pool: Pool) => {
  const migrationDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
  await pool.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const migrations = (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of migrations) {
    const applied = await pool.query('select 1 from schema_migrations where name = $1', [name]);
    if (applied.rowCount) continue;
    await withTransaction(pool, async (client) => {
      await client.query(await readFile(path.join(migrationDirectory, name), 'utf8'));
      await client.query('insert into schema_migrations(name) values ($1)', [name]);
    });
    console.log(`Applied migration ${name}`);
  }
};
