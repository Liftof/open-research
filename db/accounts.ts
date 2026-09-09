import { currentUser } from '@clerk/nextjs/server';
import { ApiError, db, hash, checkOrigin } from '@/db/store';
import { foundingAuthor, type Author } from '@/lib/research';

type AuthorRow = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  website: string;
  created_at: string;
};
export const publicAuthor = (a: AuthorRow): Author => ({
  id: a.id,
  handle: a.handle,
  name: a.name,
  bio: a.bio,
  website: a.website,
  createdAt: a.created_at,
});
export async function browserIdentity() {
  const user = await currentUser();
  if (!user) return null;
  return {
    subjectHash: await hash(user.id),
    suggestedName: user.fullName || user.username || '',
    founder:
      !!process.env.FOUNDER_EMAIL_SHA256 &&
      user.emailAddresses.some(
        (email) =>
          email.verification?.status === 'verified' &&
          email.id === user.primaryEmailAddressId,
      ) &&
      (await hash(user.primaryEmailAddress!.emailAddress.toLowerCase())) ===
        process.env.FOUNDER_EMAIL_SHA256,
  };
}
export async function browserAccount() {
  const identity = await browserIdentity();
  if (!identity) return { identity: null, author: null };
  if (identity.founder) {
    await db()
      .prepare(
        "UPDATE authors SET subject_hash = ? WHERE id = 'author-pb' AND subject_hash = 'unclaimed:founder'",
      )
      .bind(identity.subjectHash)
      .run();
  }
  const row = await db()
    .prepare('SELECT * FROM authors WHERE subject_hash = ?')
    .bind(identity.subjectHash)
    .first<AuthorRow>();
  return { identity, author: row ? publicAuthor(row) : null };
}
export async function accountFor(
  req: Request,
  browserOnly = false,
): Promise<Author | null> {
  const authorization = req.headers.get('authorization');
  if (authorization && !browserOnly) {
    if (!/^Bearer or_[a-f0-9]{64}$/.test(authorization))
      throw new ApiError('Invalid API key.', 401);
    const row = await db()
      .prepare(
        'SELECT a.* FROM authors a JOIN api_keys k ON k.author_id = a.id WHERE k.token_hash = ? AND k.revoked_at IS NULL AND k.expires_at > ?',
      )
      .bind(await hash(authorization.slice(7)), new Date().toISOString())
      .first<AuthorRow>();
    if (!row) throw new ApiError('API key expired or revoked.', 401);
    return publicAuthor(row);
  }
  return (await browserAccount()).author;
}
export async function requireAccount(req: Request, browserOnly = false) {
  checkOrigin(req);
  const author = await accountFor(req, browserOnly);
  if (!author) throw new ApiError('Create an account to contribute.', 401);
  return author;
}
export async function findAuthor(handle: string) {
  const row = await db()
    .prepare('SELECT * FROM authors WHERE handle = ?')
    .bind(handle)
    .first<AuthorRow>();
  return row
    ? publicAuthor(row)
    : handle === foundingAuthor.handle
      ? foundingAuthor
      : null;
}
export function websiteField(value: unknown) {
  if (typeof value !== 'string' || value.length > 2000)
    throw new ApiError('Invalid website.');
  if (!value.trim()) return '';
  try {
    const u = new URL(value);
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
      throw Error();
    return u.href;
  } catch {
    throw new ApiError('Use an HTTP or HTTPS website.');
  }
}
