import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())`;
const name = '0000_fat_manta';
if (
  !(await sql`SELECT name FROM schema_migrations WHERE name=${name}`).length
) {
  const source = await readFile(
    new URL('../drizzle/0000_fat_manta.sql', import.meta.url),
    'utf8',
  );
  await sql.transaction([
    ...source
      .split('--> statement-breakpoint')
      .filter((s) => s.trim())
      .map((s) => sql.query(s)),
    sql`INSERT INTO schema_migrations (name) VALUES (${name})`,
  ]);
}
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_file_key ON papers (file_key) WHERE file_key <> ''`;
console.log('Database migration complete.');
