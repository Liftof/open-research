import {
  db,
  hash,
  reply,
  fail,
  ApiError,
  textField,
  rateLimit,
  jsonBody,
} from '@/db/store';
import { requireAccount } from '@/db/accounts';
export async function GET(req: Request) {
  try {
    const author = await requireAccount(req, true);
    const keys = await db()
      .prepare(
        'SELECT id,label,prefix,created_at AS createdAt,expires_at AS expiresAt FROM api_keys WHERE author_id=? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC',
      )
      .bind(author.id, new Date().toISOString())
      .all();
    return reply({ keys: keys.results });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    const author = await requireAccount(req, true);
    const data = await jsonBody(req);
    const label = textField(data.label, 'Key name', 2, 60);
    await rateLimit(req, 'key', 10, author.id);
    const count = await db()
      .prepare(
        'SELECT COUNT(*) AS n FROM api_keys WHERE author_id=? AND revoked_at IS NULL AND expires_at>?',
      )
      .bind(author.id, new Date().toISOString())
      .first<{ n: number }>();
    if ((count?.n || 0) >= 10)
      throw new ApiError(
        'Revoke an existing key before creating another.',
        409,
      );
    const token =
      'or_' +
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
    const key = {
      id: crypto.randomUUID(),
      label,
      prefix: token.slice(0, 11),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    };
    await db()
      .prepare(
        'INSERT INTO api_keys (id,author_id,token_hash,label,prefix,created_at,expires_at) VALUES (?,?,?,?,?,?,?)',
      )
      .bind(
        key.id,
        author.id,
        await hash(token),
        label,
        key.prefix,
        key.createdAt,
        key.expiresAt,
      )
      .run();
    return reply({ key, token }, 201);
  } catch (e) {
    return fail(e);
  }
}
