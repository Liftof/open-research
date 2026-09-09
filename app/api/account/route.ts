import {
  db,
  reply,
  fail,
  ApiError,
  checkOrigin,
  textField,
  rateLimit,
  jsonBody,
} from '@/db/store';
import {
  browserAccount,
  browserIdentity,
  requireAccount,
  websiteField,
} from '@/db/accounts';
import { foundingAuthor } from '@/lib/research';
export async function GET() {
  try {
    const { identity, author } = await browserAccount();
    return reply({
      signedIn: !!identity,
      author,
      suggestedName: identity?.suggestedName || '',
      suggestedHandle: identity?.founder ? foundingAuthor.handle : '',
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const identity = await browserIdentity();
    if (!identity) throw new ApiError('Sign in to create an account.', 401);
    const existing = await browserAccount();
    if (existing.author) return reply({ author: existing.author });
    if (Number(req.headers.get('content-length') || 0) > 10000)
      throw new ApiError('Profile too large.', 413);
    const data = await jsonBody(req);
    const name = textField(data.name, 'Name', 2, 100);
    const handle = textField(data.handle, 'Username', 3, 40).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle))
      throw new ApiError('Use lowercase letters, numbers and single hyphens.');
    if (handle === foundingAuthor.handle && !identity.founder)
      throw new ApiError('This username is taken.', 409);
    if (identity.founder && handle !== foundingAuthor.handle)
      throw new ApiError(
        'Use pierre-baptiste-borges to link your existing paper.',
      );
    await rateLimit(req, 'account', 10, identity.subjectHash);
    const id = identity.founder ? foundingAuthor.id : crypto.randomUUID();
    const inserted = await db()
      .prepare(
        'INSERT INTO authors (id,subject_hash,handle,name,bio,website,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id',
      )
      .bind(
        id,
        identity.subjectHash,
        handle,
        name,
        identity.founder ? foundingAuthor.bio : '',
        identity.founder ? foundingAuthor.website : '',
        new Date().toISOString(),
      )
      .first();
    if (!inserted) {
      const current = await browserAccount();
      if (current.author) return reply({ author: current.author });
      throw new ApiError('This username is taken.', 409);
    }
    return reply({ author: (await browserAccount()).author }, 201);
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(req: Request) {
  try {
    const author = await requireAccount(req, true);
    if (Number(req.headers.get('content-length') || 0) > 10000)
      throw new ApiError('Profile too large.', 413);
    const data = await jsonBody(req);
    const name = textField(data.name, 'Name', 2, 100),
      bio = textField(data.bio || '', 'Bio', 0, 500),
      website = websiteField(data.website || '');
    await db().batch([
      db()
        .prepare('UPDATE authors SET name=?,bio=?,website=? WHERE id=?')
        .bind(name, bio, website, author.id),
      db()
        .prepare(
          "UPDATE papers SET author=? WHERE author_id=? AND external_pdf_url=''",
        )
        .bind(name, author.id),
      db()
        .prepare('UPDATE comments SET author=? WHERE author_id=?')
        .bind(name, author.id),
    ]);
    return reply({ author: (await browserAccount()).author });
  } catch (e) {
    return fail(e);
  }
}
