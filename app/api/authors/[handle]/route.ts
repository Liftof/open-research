import { db, reply, fail, ApiError, toPaper, getPaper } from '@/db/store';
import { findAuthor } from '@/db/accounts';
import { foundingAuthor, inaugural } from '@/lib/research';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
    const author = await findAuthor(handle);
    if (!author) throw new ApiError('Author not found.', 404);
    const rows = await db()
      .prepare(
        'SELECT p.*, t.declared_models, t.model_scan, ? AS author_handle, (SELECT name FROM authors WHERE id=p.author_id) AS contributor_name, (SELECT COUNT(*) FROM comments c WHERE c.paper_id=p.id) AS comments FROM papers p LEFT JOIN paper_transparency t ON t.paper_id=p.id WHERE p.author_id=? AND withdrawn=0 ORDER BY created_at DESC LIMIT 200',
      )
      .bind(author.handle, author.id)
      .all<Record<string, unknown>>();
    const papers = rows.results.map((r) => toPaper(r));
    if (author.id === foundingAuthor.id) {
      const p = await getPaper(inaugural.id);
      if (p) papers.push(p);
    }
    return reply({
      author,
      papers: papers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  } catch (e) {
    return fail(e);
  }
}
