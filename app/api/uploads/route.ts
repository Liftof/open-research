import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAccount } from '@/db/accounts';
import { db, fail, ApiError, rateLimit, jsonBody, reply } from '@/db/store';

export async function POST(request: Request) {
  try {
    const body = (await jsonBody(request)) as unknown as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const author = await requireAccount(request);
        if (!/^papers\/[a-f0-9-]{36}\.pdf$/.test(pathname))
          throw new ApiError('Invalid upload path.');
        await rateLimit(request, 'upload', 16, author.id);
        await db()
          .prepare(
            'INSERT INTO uploads (pathname,author_id,created_at) VALUES (?,?,?)',
          )
          .bind(pathname, author.id, new Date().toISOString())
          .run();
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 12 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
      onUploadCompleted: async () => {},
    });
    return reply(result);
  } catch (error) {
    return fail(error);
  }
}
