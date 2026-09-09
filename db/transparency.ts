import { requireAccount } from './accounts';
import { ApiError, db } from './store';
import { foundingAuthor, inaugural } from '@/lib/research';
import { modelKey, type ModelUse } from '@/lib/models';
export function validateModels(value: unknown): ModelUse[] {
  if (!Array.isArray(value) || value.length > 12)
    throw new ApiError('Use a list of up to 12 models.');
  const seen = new Set<string>();
  return value.map((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      item.name.length > 100 ||
      (item.role !== undefined &&
        (typeof item.role !== 'string' || item.role.length > 160))
    )
      throw new ApiError(
        'Each model needs a name (100 characters max) and an optional role (160 characters max).',
      );
    const model = { name: item.name.trim(), role: item.role?.trim() || '' };
    if (seen.has(modelKey(model.name)))
      throw new ApiError('List each model only once.');
    seen.add(modelKey(model.name));
    return model;
  });
}
export async function requirePaperOwner(req: Request, id: string) {
  const actor = await requireAccount(req);
  const owner =
    id === inaugural.id
      ? foundingAuthor.id
      : (
          await db()
            .prepare('SELECT author_id FROM papers WHERE id=? AND withdrawn=0')
            .bind(id)
            .first<{ author_id: string }>()
        )?.author_id;
  if (!owner) throw new ApiError('Publication not found.', 404);
  if (owner !== actor.id)
    throw new ApiError('Only the contributor can update this paper.', 403);
  return actor;
}
