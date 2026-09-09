import { requireAccount } from '@/db/accounts';
import {
  db,
  reply,
  checkOrigin,
  ApiError,
  fail,
  textField,
  rateLimit,
  getPaper,
} from '@/db/store';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAccount(req);
    const { id } = await params;
    if (Number(req.headers.get('content-length') || 0) > 20000)
      throw new ApiError('Comment too long.', 413);
    const data = (await req.json()) as Record<string, unknown>;
    if (!data || typeof data !== 'object')
      throw new ApiError('Invalid comment.');
    const author = actor.name;
    const body = textField(data.body, 'Comment', 5, 4000);
    const kind = String(data.kind);
    if (!['Question', 'Review', 'Reproduction', 'Discussion'].includes(kind))
      throw new ApiError('Invalid comment type.');
    if (!(await getPaper(id)))
      throw new ApiError('Publication not found.', 404);
    await rateLimit(req, 'comment', 30, actor.id);
    const commentId = crypto.randomUUID();
    await db()
      .prepare(
        'INSERT INTO comments (id,paper_id,author,body,kind,created_at,owner_hash,author_id) VALUES (?,?,?,?,?,?,?,?)',
      )
      .bind(
        commentId,
        id,
        author,
        body,
        kind,
        new Date().toISOString(),
        actor.id,
        actor.id,
      )
      .run();
    return reply({ id: commentId }, 201);
  } catch (e) {
    return fail(e);
  }
}
