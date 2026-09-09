import { accountFor, requireAccount } from '@/db/accounts';
import { inaugural } from '@/lib/research';
import {
  db,
  files,
  reply,
  checkOrigin,
  ApiError,
  fail,
  getPaper,
} from '@/db/store';
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const actor = await accountFor(req);
    const paper = await getPaper(id, actor?.id);
    if (!paper)
      throw new ApiError(
        'This publication was not found or has been withdrawn.',
        404,
      );
    const data = await db()
      .prepare(
        'SELECT id,author,body,kind,created_at,author_id, (SELECT handle FROM authors WHERE id=comments.author_id) AS author_handle FROM comments WHERE paper_id = ? ORDER BY created_at ASC LIMIT 500',
      )
      .bind(id)
      .all<Record<string, unknown>>();
    return reply({
      paper,
      comments: data.results.map((r) => ({
        id: r.id,
        author: r.author,
        authorHandle: r.author_handle,
        body: r.body,
        kind: r.kind,
        createdAt: r.created_at,
        mine: !!actor && r.author_id === actor.id,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request, { params }: Context) {
  try {
    const actor = await requireAccount(req);
    const { id } = await params;
    if (id === inaugural.id)
      throw new ApiError(
        'The inaugural paper is preserved in the archive.',
        403,
      );
    const row = await db()
      .prepare(
        'SELECT author_id,file_key FROM papers WHERE id = ? AND withdrawn = 0',
      )
      .bind(id)
      .first<{ author_id: string; file_key: string }>();
    if (!row) throw new ApiError('Publication not found.', 404);
    if (row.author_id !== actor.id)
      throw new ApiError('This publication belongs to another author.', 403);
    await db()
      .prepare('UPDATE papers SET withdrawn = 1 WHERE id = ? AND author_id = ?')
      .bind(id, actor.id)
      .run();
    if (row.file_key) await files().delete(row.file_key);
    return reply({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
