import {
  emptyScan,
  parseStored,
  type ModelUse,
  type ModelScan,
} from '@/lib/models';
import { database } from './database';
import { fileStore } from './files';
import { inaugural, legacyLabels, type Paper } from '@/lib/research';
export const db = database;
export const files = fileStore;
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  )
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}
export function reply(data: unknown, status = 200, cookie?: string) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (
    (origin && origin !== new URL(req.url).origin) ||
    req.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new ApiError('Request origin is not allowed.', 403);
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function fail(e: unknown) {
  if (e instanceof ApiError) return reply({ error: e.message }, e.status);
  console.error(
    'Research request failed',
    e instanceof Error ? e.message : 'unknown',
  );
  return reply(
    {
      error:
        'Service unavailable. Your fields have been kept; please try again.',
    },
    503,
  );
}
export function textField(v: unknown, name: string, min: number, max: number) {
  if (typeof v !== 'string' || v.trim().length < min || v.length > max)
    throw new ApiError(`${name}: use ${min} to ${max} characters.`);
  return v.trim();
}
export async function rateLimit(
  req: Request,
  kind: string,
  limit: number,
  accountId?: string,
) {
  const who = await hash(
    accountId ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'local',
  );
  const since = Date.now() - 3600000;
  const count = await db()
    .prepare(
      'SELECT COUNT(*) AS n FROM submissions WHERE actor_hash = ? AND kind = ? AND created_at > ?',
    )
    .bind(who, kind, since)
    .first<{ n: number }>();
  if ((count?.n || 0) >= limit)
    throw new ApiError(
      'Hourly contribution limit reached. Try again later.',
      429,
    );
  await db().batch([
    db()
      .prepare(
        'INSERT INTO submissions (id, actor_hash, kind, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(crypto.randomUUID(), who, kind, Date.now()),
    db().prepare('DELETE FROM submissions WHERE created_at < ?').bind(since),
  ]);
}
export function toPaper(r: Record<string, unknown>, authorId = ''): Paper {
  return {
    id: String(r.id),
    title: String(r.title),
    author: String(r.author),
    authorHandle:
      !r.external_pdf_url && r.author_handle
        ? String(r.author_handle)
        : undefined,
    shared: !!r.external_pdf_url,
    sharedBy: r.external_pdf_url ? String(r.contributor_name || '') : undefined,
    sharedByHandle:
      r.external_pdf_url && r.author_handle
        ? String(r.author_handle)
        : undefined,
    publishedAt: r.published_at ? String(r.published_at) : undefined,
    pages: r.page_count ? Number(r.page_count) : undefined,
    abstract: String(r.abstract),
    category: legacyLabels[String(r.category)] || String(r.category),
    kind: legacyLabels[String(r.kind)] || String(r.kind),
    createdAt: String(r.created_at),
    method: String(r.method),
    limitations: String(r.limitations),
    aiUse: String(r.ai_use),
    models: parseStored<ModelUse[]>(r.declared_models, []),
    modelScan: parseStored<ModelScan>(r.model_scan, emptyScan),
    license: legacyLabels[String(r.license)] || String(r.license),
    pdfUrl: r.external_pdf_url
      ? String(r.external_pdf_url)
      : `/api/papers/${r.id}/file`,
    sourceUrl: String(r.source_url),
    fileSize: Number(r.file_size),
    comments: Number(r.comments || 0),
    mine: !!authorId && r.author_id === authorId,
  };
}
export async function getPaper(id: string, authorId = '') {
  if (id === inaugural.id) {
    const c = await db()
      .prepare(
        'SELECT (SELECT COUNT(*) FROM comments WHERE paper_id = ?1) AS n, (SELECT declared_models FROM paper_transparency WHERE paper_id = ?1) AS declared_models, (SELECT model_scan FROM paper_transparency WHERE paper_id = ?1) AS model_scan',
      )
      .bind(id)
      .first<{ n: number; declared_models?: string; model_scan?: string }>();
    return {
      ...inaugural,
      mine: authorId === 'author-pb',
      comments: Number(c?.n || 0),
      models: parseStored<ModelUse[]>(c?.declared_models, []),
      modelScan: parseStored<ModelScan>(c?.model_scan, emptyScan),
    };
  }
  const r = await db()
    .prepare(
      'SELECT p.*, t.declared_models, t.model_scan, (SELECT handle FROM authors WHERE id=p.author_id) AS author_handle, (SELECT name FROM authors WHERE id=p.author_id) AS contributor_name, (SELECT COUNT(*) FROM comments c WHERE c.paper_id = p.id) AS comments FROM papers p LEFT JOIN paper_transparency t ON t.paper_id=p.id WHERE p.id = ? AND p.withdrawn = 0',
    )
    .bind(id)
    .first<Record<string, unknown>>();
  return r ? toPaper(r, authorId) : null;
}

export async function listPapers() {
  const data = await db()
    .prepare(
      'SELECT p.*, t.declared_models, t.model_scan, (SELECT handle FROM authors WHERE id=p.author_id) AS author_handle, (SELECT name FROM authors WHERE id=p.author_id) AS contributor_name, (SELECT COUNT(*) FROM comments c WHERE c.paper_id=p.id) AS comments FROM papers p LEFT JOIN paper_transparency t ON t.paper_id=p.id WHERE p.withdrawn=0 ORDER BY p.created_at DESC LIMIT 200',
    )
    .all<Record<string, unknown>>();
  const first = await getPaper(inaugural.id);
  return [
    ...data.results.map((row) => toPaper(row)),
    ...(first ? [first] : []),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function jsonBody(req: Request) {
  if (Number(req.headers.get('content-length') || 0) > 20000)
    throw new ApiError('Request too large.', 413);
  try {
    const value: unknown = await req.json();
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError('Expected a JSON object.');
  }
}
