import { db, reply, fail, jsonBody } from '@/db/store';
import { requirePaperOwner, validateModels } from '@/db/transparency';
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requirePaperOwner(req, id);
    const models = validateModels((await jsonBody(req)).models);
    await db()
      .prepare(
        'INSERT INTO paper_transparency (paper_id,declared_models) VALUES (?,?) ON CONFLICT(paper_id) DO UPDATE SET declared_models=excluded.declared_models',
      )
      .bind(id, JSON.stringify(models))
      .run();
    return reply({ models });
  } catch (e) {
    return fail(e);
  }
}
