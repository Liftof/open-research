type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};
export function registerTools(tools: Tool[]) {
  const ctx = (
    document as unknown as {
      modelContext?: {
        registerTool: (
          t: Tool,
          o: { signal: AbortSignal },
        ) => void | Promise<void>;
      };
    }
  ).modelContext;
  if (!ctx?.registerTool) return;
  const lifecycle = new AbortController();
  for (const tool of tools) {
    try {
      void Promise.resolve(
        ctx.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  }
  return () => lifecycle.abort();
}
