export type ModelUse = { name: string; role?: string };
export type ModelMention = { name: string; page: number; excerpt: string };
export type ModelScan = {
  status: 'not_scanned' | 'complete' | 'partial' | 'unreadable' | 'unavailable';
  mentions: ModelMention[];
  pagesScanned: number;
  totalPages?: number;
  scannedAt?: string;
};
export const emptyScan: ModelScan = {
  status: 'not_scanned',
  mentions: [],
  pagesScanned: 0,
};
export function modelBrand(name: string) {
  if (/\b(gpt|chatgpt|codex|openai|o[134])\b/i.test(name)) return 'openai';
  if (/\b(claude|anthropic)\b/i.test(name)) return 'claude';
  if (/\b(gemma|alphaevolve)\b/i.test(name)) return 'google';
  if (/\bgemini\b/i.test(name)) return 'gemini';
  if (/\bllama\b/i.test(name)) return 'meta';
  if (/deepseek/i.test(name)) return 'deepseek';
  if (/mistral|mixtral|codestral|devstral/i.test(name)) return 'mistral';
  if (/qwen|qwq/i.test(name)) return 'qwen';
  if (/grok|xai/i.test(name)) return 'grok';
  return null;
}
export function modelKind(name: string) {
  return /^(?:openai\s+)?(?:codex|chatgpt|alphaevolve)$/i.test(name)
    ? 'Tool'
    : 'Model';
}
export function modelKey(name: string) {
  return name.toLowerCase().replace(/[\s–—-]+/g, '');
}
export function parseStored<T>(value: unknown, fallback: T): T {
  try {
    return typeof value === 'string' ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
// Matches explicit names, not writing style or an authorship score.
const patterns = [
  /\bGPT[\s-]?[3-9](?:\.\d+)?o?(?:[\s-](?:astra|sol|terra|luna|codex|turbo|mini|nano|pro|spark|instant))*/gi,
  /\bo[134](?:[\s-](?:mini|pro|preview))?\b/g,
  /\bClaude(?:[\s-](?:Opus|Sonnet|Haiku|\d+(?:\.\d+)?)){0,3}\b/gi,
  /\bGemini(?:[\s-](?:\d+(?:\.\d+)?|Pro|Flash|Lite|Ultra|Deep\s+Think)){0,4}\b/gi,
  /\b(?:DeepSeek)(?:[\s-](?:[VR]\d+(?:\.\d+)?|Coder|Chat)){0,2}\b/gi,
  /\b(?:Qwen|QwQ)\d?(?:\.\d+)?(?:[\s-](?:Coder|VL|Thinking|Instruct|\d+[BA])){0,3}\b/gi,
  /\bLlama(?:[\s-](?:\d+(?:\.\d+)?|\d+B|Scout|Maverick|Instruct)){0,3}\b/gi,
  /\b(?:Mistral|Mixtral|Codestral|Devstral)(?:[\s-](?:Large|Medium|Small|\d+(?:\.\d+)?|\d+B|\d+x\d+B)){0,3}\b/gi,
  /\bGrok(?:[\s-](?:\d+(?:\.\d+)?|Fast|Code)){0,3}\b/gi,
  /\b(?:ChatGPT|(?:OpenAI\s+)?Codex|AlphaEvolve)\b/gi,
];
export function detectModelMentions(
  text: string,
  page: number,
): ModelMention[] {
  const normalized = text
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ');
  const found = new Map<string, ModelMention>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of normalized.matchAll(pattern)) {
      let name = match[0].replace(/^OpenAI\s+/i, '').trim();
      name = name.replace(/^GPT\s+/i, 'GPT-');
      const context = normalized.slice(
        Math.max(0, match.index - 75),
        match.index + match[0].length + 75,
      );
      if (
        /^(Claude|Gemini|Llama|Mistral|Grok|Codex)$/i.test(name) &&
        !/OpenAI|Anthropic|DeepMind|\bLLMs?\b|language model|\bAI\b|chatbot|GPT-|AI assistant/i.test(
          context,
        )
      )
        continue;
      if (
        /^Claude$/i.test(name) &&
        /^\s+(?:Louis|Shannon|Monet|Debussy|Bernard|Lévi)/.test(
          normalized.slice(match.index + match[0].length),
        )
      )
        continue;
      if (!found.has(modelKey(name)))
        found.set(modelKey(name), {
          name,
          page,
          excerpt: evidenceExcerpt(normalized, match.index, match[0].length),
        });
      if (found.size >= 24) break;
    }
  }
  return [...found.values()].slice(0, 24);
}

function evidenceExcerpt(text: string, index: number, length: number) {
  const start = index > 55 ? text.lastIndexOf(' ', index - 55) + 1 : 0;
  const next = text.indexOf(' ', index + length + 65);
  const end = next < 0 ? text.length : next;
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}
