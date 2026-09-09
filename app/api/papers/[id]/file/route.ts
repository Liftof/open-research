import { inaugural } from '@/lib/research';
import { fetchPublicPdf, inauguralPdf } from '@/db/pdf';
import { db, files, ApiError, fail } from '@/db/store';
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (id === inaugural.id) {
      const response = await inauguralPdf(req);
      if (!response.ok) throw new ApiError('Document not found.', 404);
      return new Response(response.body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${new URL(req.url).searchParams.has('download') ? 'attachment' : 'inline'}; filename="local-exchange-profiles.pdf"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    const row = await db()
      .prepare(
        'SELECT file_key, external_pdf_url FROM papers WHERE id = ? AND withdrawn = 0',
      )
      .bind(id)
      .first<{ file_key: string; external_pdf_url: string }>();
    if (!row) throw new ApiError('Document not found.', 404);
    if (row.external_pdf_url) {
      if (!new URL(req.url).searchParams.has('download'))
        return Response.redirect(row.external_pdf_url, 302);
      const bytes = await fetchPublicPdf(row.external_pdf_url);
      return new Response(bytes.slice().buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${id}.pdf"`,
          'Content-Length': String(bytes.length),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    const object = await files().get(row.file_key);
    if (!object) throw new ApiError('Document not found.', 404);
    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${new URL(req.url).searchParams.has('download') ? 'attachment' : 'inline'}; filename="${id}.pdf"`,
        'Content-Length': String(object.size),
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': 'sandbox',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return fail(e);
  }
}
