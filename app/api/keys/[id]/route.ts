import { db, reply, fail, ApiError } from '@/db/store';
import { requireAccount } from '@/db/accounts';
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const author = await requireAccount(req, true);
    const { id } = await params;
    const row = await db()
      .prepare(
        'UPDATE api_keys SET revoked_at=? WHERE id=? AND author_id=? AND revoked_at IS NULL RETURNING id',
      )
      .bind(new Date().toISOString(), id, author.id)
      .first();
    if (!row) throw new ApiError('Key not found.', 404);
    return reply({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
