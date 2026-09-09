import { requireAccount } from '@/db/accounts';
import { db, reply, checkOrigin, ApiError, fail } from '@/db/store';
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAccount(req);
    const { id } = await params;
    const r = await db()
      .prepare(
        'DELETE FROM comments WHERE id = ? AND author_id = ? RETURNING id',
      )
      .bind(id, actor.id)
      .first();
    if (!r) throw new ApiError('You can only delete your own comments.', 403);
    return reply({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
