import { put, get, del } from '@vercel/blob';

export function fileStore() {
  return {
    async put(key: string, body: ReadableStream, _options?: unknown) {
      return put(key, body, {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/pdf',
      });
    },
    async get(key: string) {
      const result = await get(key, { access: 'private', useCache: false });
      if (!result || result.statusCode !== 200) return null;
      return {
        body: result.stream,
        size: result.blob.size,
        arrayBuffer: () => new Response(result.stream).arrayBuffer(),
      };
    },
    async delete(key: string) {
      await del(key);
    },
  };
}
