import { db, reply, fail, rateLimit } from '@/db/store';
import { requirePaperOwner } from '@/db/transparency';
import { scanPaper } from '@/db/pdf';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const actor = await requirePaperOwner(req, id);
    await rateLimit(req, 'pdf-scan', 12, actor.id);
    const scan = await scanPaper(id, req);
    await db()
      .prepare(
        'INSERT INTO paper_transparency (paper_id,model_scan) VALUES (?,?) ON CONFLICT(paper_id) DO UPDATE SET model_scan=excluded.model_scan',
      )
      .bind(id, JSON.stringify(scan))
      .run();
    return reply({ scan });
  } catch (e) {
    return fail(e);
  }
}
