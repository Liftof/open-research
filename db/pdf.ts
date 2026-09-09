import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchPublicSource } from './public-fetch';
import { getDocumentProxy } from 'unpdf';
import { ApiError, db, files } from './store';
import { inaugural } from '@/lib/research';
import { detectModelMentions, modelKey, type ModelScan } from '@/lib/models';
const MAX_BYTES = 12 * 1024 * 1024;
// Only public HTTPS destinations. Redirects are checked individually; cookies and auth are never forwarded.
export function publicPdfUrl(value: string) {
  const u = new URL(value);
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    (u.port && u.port !== '443') ||
    !host.includes('.') ||
    host.includes(':') ||
    /^[\d.]+$/.test(host) ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion|home|lan)$/.test(
      host,
    )
  ) {
    throw new ApiError('The PDF must use a public HTTPS address.');
  }
  return u;
}
export async function fetchPublicPdf(value: string): Promise<Uint8Array> {
  let url = publicPdfUrl(value);
  const signal = AbortSignal.timeout(15000);
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetchPublicSource(url, signal);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) throw new ApiError('The source did not return a PDF.');
      url = publicPdfUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok || !response.body)
      throw new ApiError('The PDF source is unavailable.', 502);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body.cancel();
      throw new ApiError('This PDF exceeds the 12 MB limit.', 413);
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        size += chunk.byteLength;
        if (size > MAX_BYTES)
          throw new ApiError('This PDF exceeds the 12 MB limit.', 413);
        chunks.push(chunk);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-'))
      throw new ApiError('The source did not return a PDF.');
    return bytes;
  }
  throw new ApiError('The PDF source redirected too many times.');
}
export async function scanPdf(bytes: Uint8Array): Promise<ModelScan> {
  const scan: ModelScan = {
    status: 'unavailable',
    mentions: [],
    pagesScanned: 0,
    scannedAt: new Date().toISOString(),
  };
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(bytes, {
      useSystemFonts: false,
      maxImageSize: 0,
    });
    scan.totalPages = pdf.numPages;
    const limit = Math.min(pdf.numPages, 200);
    const deadline = Date.now() + 15000;
    let characters = 0;
    const found = new Set<string>();
    // Sequential page extraction bounds memory; long documents include their final acknowledgements.
    const pageNumbers =
      pdf.numPages <= 200
        ? Array.from({ length: limit }, (_, i) => i + 1)
        : [
            ...Array.from({ length: 150 }, (_, i) => i + 1),
            ...Array.from({ length: 50 }, (_, i) => pdf!.numPages - 49 + i),
          ];
    for (const pageNumber of pageNumbers) {
      if (Date.now() > deadline || characters > 2000000) break;
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      characters += text.length;
      for (const mention of detectModelMentions(text, pageNumber)) {
        const key = modelKey(mention.name);
        if (!found.has(key) && found.size < 24) {
          found.add(key);
          scan.mentions.push(mention);
        }
      }
      scan.pagesScanned++;
      page.cleanup();
    }
    scan.status =
      characters < 30
        ? 'unreadable'
        : scan.pagesScanned === pdf.numPages
          ? 'complete'
          : 'partial';
  } catch {
    scan.status = scan.pagesScanned ? 'partial' : 'unavailable';
  } finally {
    await pdf?.loadingTask.destroy().catch(() => {});
  }
  return scan;
}
export async function scanPaper(
  id: string,
  request: Request,
): Promise<ModelScan> {
  try {
    let bytes: Uint8Array;
    if (id === inaugural.id) {
      const response = await inauguralPdf(request);
      if (!response.ok) throw Error('PDF unavailable');
      bytes = new Uint8Array(await response.arrayBuffer());
    } else {
      const row = await db()
        .prepare(
          'SELECT file_key, external_pdf_url FROM papers WHERE id=? AND withdrawn=0',
        )
        .bind(id)
        .first<{ file_key: string; external_pdf_url: string }>();
      if (!row) throw new ApiError('Publication not found.', 404);
      if (row.external_pdf_url)
        bytes = await fetchPublicPdf(row.external_pdf_url);
      else {
        const object = await files().get(row.file_key);
        if (!object) throw Error('PDF unavailable');
        bytes = new Uint8Array(await object.arrayBuffer());
      }
    }
    return await scanPdf(bytes);
  } catch {
    return {
      status: 'unavailable',
      mentions: [],
      pagesScanned: 0,
      scannedAt: new Date().toISOString(),
    };
  }
}

export async function inauguralPdf(_request: Request) {
  const bytes = await readFile(
    path.join(process.cwd(), 'public', inaugural.pdfUrl),
  );
  return new Response(bytes, {
    headers: { 'Content-Type': 'application/pdf' },
  });
}
