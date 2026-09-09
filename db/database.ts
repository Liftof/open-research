import { neon } from '@neondatabase/serverless';

function client() {
  if (!process.env.DATABASE_URL) throw new Error('Database unavailable');
  return neon(process.env.DATABASE_URL);
}

// Keep parameterized application queries portable across the original SQLite
// prototype and Postgres. Values never enter the SQL text.
export function postgresQuery(sql: string) {
  let index = 0;
  return sql.replace(/\?(\d+)?/g, (_, number) => `$${number || ++index}`);
}
class Statement {
  readonly sql: string;
  readonly values: unknown[];
  constructor(sql: string, values: unknown[] = []) {
    this.sql = sql;
    this.values = values;
  }
  bind(...values: unknown[]) {
    return new Statement(this.sql, values);
  }
  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const rows = await client().query(postgresQuery(this.sql), this.values);
    return (rows[0] as T | undefined) ?? null;
  }
  async all<T = Record<string, unknown>>() {
    return {
      results: (await client().query(
        postgresQuery(this.sql),
        this.values,
      )) as T[],
    };
  }
  async run() {
    return client().query(postgresQuery(this.sql), this.values);
  }
}
export function database() {
  return {
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      const sql = client();
      return sql.transaction(
        statements.map((s) => sql.query(postgresQuery(s.sql), s.values)),
      );
    },
  };
}
