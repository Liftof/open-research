import { validateModels } from '@/db/transparency';
import { scanPdf, fetchPublicPdf } from '@/db/pdf';
import { emptyScan } from '@/lib/models';
import { requireAccount, websiteField } from '@/db/accounts';
import { categories, kinds } from '@/lib/research';
import {
  db,
  files,
  reply,
  ApiError,
  fail,
  textField,
  rateLimit,
  listPapers,
} from '@/db/store';
export async function GET() {
  try {
    return reply({ papers: await listPapers() });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  let storedKey: string | undefined;
  try {
    const actor = await requireAccount(req);
    if (Number(req.headers.get('content-length') || 0) > 4 * 1024 * 1024)
      throw new ApiError(
        'For files over 4 MB, use the direct upload endpoint.',
        413,
      );
    const data = await req.formData();
    const title = textField(data.get('title'), 'Title', 8, 240);
    const externalPdfUrl = websiteField(data.get('pdfUrl') || '');
    const author = externalPdfUrl
      ? textField(data.get('authors'), 'Authors', 2, 240)
      : actor.name;
    const abstract = textField(data.get('abstract'), 'Abstract', 60, 12000);
    const category = String(data.get('category'));
    const kind = String(data.get('kind'));
    const license = externalPdfUrl
      ? 'See original'
      : String(data.get('license'));
    if (
      !categories.slice(1).includes(category) ||
      !kinds.includes(kind) ||
      (!externalPdfUrl &&
        !['All rights reserved', 'CC BY 4.0', 'CC0'].includes(license))
    )
      throw new ApiError('Choose a valid category, type and license.');
    if (data.get('rights') !== 'yes')
      throw new ApiError('Confirm you have permission to publish this work.');
    const optional = (name: string, max = 5000) =>
      textField(data.get(name) || '', name, 0, max);
    const method = optional('method');
    const limitations = optional('limitations');
    const aiUse = optional('aiUse', 2000);
    let modelInput: unknown = [];
    try {
      modelInput = JSON.parse(optional('models', 4000) || '[]');
    } catch {
      throw new ApiError('Models must be a JSON array.');
    }
    const models = validateModels(modelInput);
    const sourceUrl = websiteField(optional('sourceUrl', 2000));
    const publishedAt = optional('publishedAt', 10);
    if (
      publishedAt &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt) ||
        !Number.isFinite(Date.parse(publishedAt)) ||
        new Date(publishedAt).toISOString().slice(0, 10) !== publishedAt ||
        publishedAt > new Date().toISOString().slice(0, 10))
    )
      throw new ApiError('Use a valid publication date, today or earlier.');
    const pageCount = data.get('pages') ? Number(data.get('pages')) : null;
    if (
      pageCount !== null &&
      (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 100000)
    )
      throw new ApiError('Use a valid page count.');
    const uploadedPath = optional('uploadedPath', 100);
    let file = data.get('file');
    if (uploadedPath) {
      if (externalPdfUrl || (file instanceof File && file.size))
        throw new ApiError('Choose one PDF source.');
      const pending = await db()
        .prepare(
          'SELECT pathname FROM uploads WHERE pathname=? AND author_id=? AND consumed=0',
        )
        .bind(uploadedPath, actor.id)
        .first();
      if (!pending)
        throw new ApiError('Upload unavailable or already published.', 409);
      const object = await files().get(uploadedPath);
      if (!object || object.size > 12 * 1024 * 1024)
        throw new ApiError('Invalid upload.');
      file = new File([await object.arrayBuffer()], 'paper.pdf', {
        type: 'application/pdf',
      });
    }
    if (!externalPdfUrl && (!(file instanceof File) || file.size === 0))
      throw new ApiError('Add a PDF file.');
    if (externalPdfUrl && file instanceof File && file.size > 0)
      throw new ApiError('Choose either a PDF upload or a link.');
    if (file instanceof File && file.size > 12 * 1024 * 1024)
      throw new ApiError('The PDF must be under 12 MB.', 413);
    if (
      !externalPdfUrl &&
      file instanceof File &&
      (!file.name.toLowerCase().endsWith('.pdf') ||
        new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !==
          '%PDF-')
    )
      throw new ApiError('The file is not a valid PDF.');
    await rateLimit(req, 'paper', 8, actor.id);
    const id = `or-${new Date().getUTCFullYear()}-${crypto.randomUUID()}`;
    const fileKey = externalPdfUrl ? '' : uploadedPath || `papers/${id}.pdf`;
    const createdAt = new Date().toISOString();
    if (file instanceof File && !externalPdfUrl && !uploadedPath) {
      await files().put(fileKey, file.stream(), {
        httpMetadata: { contentType: 'application/pdf' },
      });
      storedKey = fileKey;
    }
    let scan = { ...emptyScan };
    try {
      scan = await scanPdf(
        externalPdfUrl
          ? await fetchPublicPdf(externalPdfUrl)
          : new Uint8Array(await (file as File).arrayBuffer()),
      );
    } catch {
      scan = {
        ...emptyScan,
        status: 'unavailable',
        scannedAt: new Date().toISOString(),
      };
    }
    const uploadClaim = uploadedPath
      ? [
          db()
            .prepare(
              'UPDATE uploads SET consumed=1 WHERE pathname=? AND author_id=? AND consumed=0',
            )
            .bind(uploadedPath, actor.id),
        ]
      : [];
    await db().batch([
      ...uploadClaim,
      db()
        .prepare(
          'INSERT INTO papers (id,title,author,abstract,category,kind,created_at,method,limitations,ai_use,license,source_url,file_key,file_size,owner_hash,author_id,external_pdf_url,published_at,page_count,withdrawn) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)',
        )
        .bind(
          id,
          title,
          author,
          abstract,
          category,
          kind,
          createdAt,
          method,
          limitations,
          aiUse,
          license,
          sourceUrl,
          fileKey,
          file instanceof File ? file.size : 0,
          actor.id,
          actor.id,
          externalPdfUrl,
          publishedAt,
          pageCount,
        ),
      db()
        .prepare(
          'INSERT INTO paper_transparency (paper_id,declared_models,model_scan) VALUES (?,?,?)',
        )
        .bind(id, JSON.stringify(models), JSON.stringify(scan)),
    ]);
    storedKey = undefined;
    return reply({ paper: { id } }, 201);
  } catch (e) {
    if (storedKey) {
      try {
        await files().delete(storedKey);
      } catch {}
    }
    return fail(e);
  }
}
