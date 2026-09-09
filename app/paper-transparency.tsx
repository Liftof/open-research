'use client';
import { useState } from 'react';
import {
  Cpu,
  Info,
  Plus,
  X,
  Download,
  Share2,
  Check,
  LoaderCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  detectModelMentions,
  emptyScan,
  modelBrand,
  modelKey,
  modelKind,
  type ModelUse,
  type ModelScan,
} from '@/lib/models';
import type { Paper } from '@/lib/research';

export function ModelLogo({ name }: { name: string }) {
  const brand = modelBrand(name);
  return brand ? (
    <img
      src={`/model-logos/${brand}.svg`}
      width={18}
      height={18}
      alt=""
      className="model-logo"
    />
  ) : (
    <Cpu size={18} aria-hidden="true" />
  );
}
export function ModelFields({
  models,
  onChange,
}: {
  models: ModelUse[];
  onChange: (models: ModelUse[]) => void;
}) {
  return (
    <div className="model-fields">
      {models.map((model, index) => (
        <div className="model-field-row" key={index}>
          <label>
            Model or tool
            <input
              value={model.name}
              maxLength={100}
              required
              placeholder="e.g. GPT-6 Astra"
              onChange={(e) =>
                onChange(
                  models.map((m, i) =>
                    i === index ? { ...m, name: e.target.value } : m,
                  ),
                )
              }
            />
          </label>
          <label>
            Role <span className="optional-label">optional</span>
            <input
              value={model.role || ''}
              maxLength={160}
              placeholder="e.g. Proof checking"
              onChange={(e) =>
                onChange(
                  models.map((m, i) =>
                    i === index ? { ...m, role: e.target.value } : m,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="remove-model"
            aria-label={`Remove model ${index + 1}`}
            onClick={() => onChange(models.filter((_, i) => i !== index))}
          >
            <X size={17} />
          </button>
        </div>
      ))}
      {models.length < 12 && (
        <button
          type="button"
          className="add-model"
          onClick={() => onChange([...models, { name: '', role: '' }])}
        >
          <Plus size={16} /> Add model
        </button>
      )}
    </div>
  );
}
export function ModelTransparency({ paper: p }: { paper: Paper }) {
  const [override, setOverride] = useState<{
    models?: ModelUse[];
    scan?: ModelScan;
  }>({});
  const models = override.models ?? p.models ?? [];
  const scan = override.scan ?? p.modelScan ?? emptyScan;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ModelUse[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const declared = new Set(models.map((m) => modelKey(m.name)));
  const disclosed = detectModelMentions(p.aiUse, 0).filter(
    (m) => !declared.has(modelKey(m.name)),
  );
  const known = new Set([
    ...declared,
    ...disclosed.map((m) => modelKey(m.name)),
  ]);
  const badges = [
    ...models.map((m) => ({ ...m, source: 'Declared' })),
    ...disclosed.map((m) => ({ ...m, source: 'Disclosed' })),
    ...scan.mentions
      .filter((m) => !known.has(modelKey(m.name)))
      .map((m) => ({ ...m, source: 'Mentioned' })),
  ];
  async function save() {
    setBusy('save');
    setError('');
    try {
      const response = await fetch(`/api/papers/${p.id}/transparency`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: draft }),
      });
      const data = (await response.json()) as {
        models: ModelUse[];
        error?: string;
      };
      if (!response.ok) throw Error(data.error || 'Could not save models.');
      setOverride((v) => ({ ...v, models: data.models }));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save models.');
    } finally {
      setBusy('');
    }
  }
  async function rescan() {
    setBusy('scan');
    setError('');
    try {
      const response = await fetch(`/api/papers/${p.id}/scan`, {
        method: 'POST',
      });
      const data = (await response.json()) as {
        scan: ModelScan;
        error?: string;
      };
      if (!response.ok) throw Error(data.error || 'Could not scan this PDF.');
      setOverride((v) => ({ ...v, scan: data.scan }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not scan this PDF.');
    } finally {
      setBusy('');
    }
  }
  return (
    <Dialog>
      <DialogTrigger
        className="model-summary"
        aria-label={`AI transparency for ${p.title}`}
      >
        <span className="model-summary-label">AI</span>
        {badges.length ? (
          badges.slice(0, 3).map((m) => (
            <span className="model-chip" key={modelKey(m.name)}>
              <ModelLogo name={m.name} />
              <span>{m.name}</span>
              <span className="model-chip-source">
                {m.source.toLowerCase()}
              </span>
            </span>
          ))
        ) : (
          <span className="model-empty">Models not declared</span>
        )}
        {badges.length > 3 && (
          <span className="model-more">+{badges.length - 3}</span>
        )}
        <Info size={14} className="model-info" />
      </DialogTrigger>
      <DialogContent className="transparency-dialog">
        <DialogTitle>AI transparency</DialogTitle>
        <DialogDescription>
          Declared use and model names found in the paper.
        </DialogDescription>
        <section className="transparency-section">
          <div className="transparency-heading">
            <h3>Declared by contributor</h3>
            {p.mine && !editing && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => {
                  setDraft(models.map((m) => ({ ...m })));
                  setEditing(true);
                  setError('');
                }}
              >
                Edit models
              </button>
            )}
          </div>
          {editing ? (
            <div>
              <ModelFields models={draft} onChange={setDraft} />
              <div className="model-editor-actions">
                <button
                  type="button"
                  className="button primary"
                  disabled={!!busy || draft.some((m) => !m.name.trim())}
                  onClick={save}
                >
                  {busy === 'save' ? 'Saving…' : 'Save models'}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : models.length ? (
            <ul className="model-detail-list">
              {models.map((m) => (
                <li key={modelKey(m.name)}>
                  <ModelLogo name={m.name} />
                  <div>
                    <b>{m.name}</b>
                    <span>
                      {m.role || `${modelKind(m.name)} · role not specified`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="transparency-muted">No models declared.</p>
          )}
        </section>
        {disclosed.length > 0 && (
          <section className="transparency-section">
            <h3>Named in the disclosure</h3>
            <ul className="model-detail-list">
              {disclosed.map((m) => (
                <li key={modelKey(m.name)}>
                  <ModelLogo name={m.name} />
                  <div>
                    <b>{m.name}</b>
                    <span>
                      {modelKind(m.name)} · from the contributor’s disclosure
                      below
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="transparency-section">
          <div className="transparency-heading">
            <h3>Mentioned in the PDF</h3>
            {scan.pagesScanned > 0 && (
              <span>
                {scan.pagesScanned}
                {scan.totalPages ? ` / ${scan.totalPages}` : ''} pages
              </span>
            )}
          </div>
          <p className="transparency-note">
            A mention may describe related work; it does not confirm use.
          </p>
          {scan.mentions.length > 0 && (
            <ul className="model-evidence-list">
              {scan.mentions.map((m) => (
                <li key={modelKey(m.name)}>
                  <div>
                    <ModelLogo name={m.name} />
                    <b>{m.name}</b>
                    <a
                      href={`${p.pdfUrl.split('#')[0]}#page=${m.page}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Page {m.page} ↗
                    </a>
                  </div>
                  <blockquote>“{m.excerpt}”</blockquote>
                </li>
              ))}
            </ul>
          )}
          {scan.status === 'not_scanned' && (
            <p className="transparency-muted">
              This PDF has not been scanned yet.
            </p>
          )}
          {scan.status === 'unavailable' && (
            <p className="transparency-muted">
              The PDF could not be scanned. Models can still be declared
              manually.
            </p>
          )}
          {scan.status === 'unreadable' && (
            <p className="transparency-muted">
              No readable text found. Scanned images are not analysed.
            </p>
          )}
          {scan.status === 'partial' && (
            <p className="transparency-muted">
              Partial scan. Some pages were not checked.
            </p>
          )}
          {scan.status === 'complete' && !scan.mentions.length && (
            <p className="transparency-muted">
              No recognized model names found. This does not establish whether
              AI was used.
            </p>
          )}
          {p.mine && (
            <button
              type="button"
              className="scan-button"
              disabled={!!busy || editing}
              onClick={rescan}
            >
              {busy === 'scan' ? (
                <>
                  <LoaderCircle size={16} className="spin" /> Scanning PDF…
                </>
              ) : scan.status === 'not_scanned' ? (
                'Scan PDF'
              ) : (
                'Scan again'
              )}
            </button>
          )}
        </section>
        {p.aiUse && (
          <section className="transparency-section">
            <h3>Disclosure</h3>
            <p className="disclosure-copy">{p.aiUse}</p>
          </section>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function PaperActions({ paper: p }: { paper: Paper }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState('');
  async function copy() {
    setError('');
    const url = new URL(`/publication/${p.id}`, location.origin).href;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareOpen(true);
    }
  }
  async function download() {
    setDownloading(true);
    setError('');
    try {
      const response = await fetch(`/api/papers/${p.id}/file?download=1`);
      if (
        !response.ok ||
        !response.headers.get('content-type')?.includes('application/pdf')
      )
        throw Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${p.title.replace(/[^\p{L}\p{N} -]/gu, '').slice(0, 100)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      setError('Download unavailable. Open the original PDF.');
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div className="paper-quick-actions">
      <button
        type="button"
        className="card-action"
        onClick={copy}
        aria-label={`Share ${p.title}`}
      >
        {copied ? <Check size={16} /> : <Share2 size={16} />}
        <span>{copied ? 'Copied' : 'Share'}</span>
      </button>
      <button
        type="button"
        className="card-action"
        onClick={download}
        disabled={downloading}
        aria-label={`Download PDF: ${p.title}`}
      >
        {downloading ? (
          <LoaderCircle size={16} className="spin" />
        ) : (
          <Download size={16} />
        )}
        <span>{downloading ? 'Downloading…' : 'PDF'}</span>
      </button>
      <span className="sr-only" role="status">
        {copied ? 'Link copied.' : downloading ? 'Downloading PDF.' : ''}
      </span>
      {error && (
        <span className="card-action-error" role="alert">
          <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer">
            {error}
          </a>
        </span>
      )}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogTitle>Share paper</DialogTitle>
          <DialogDescription>Copy this link.</DialogDescription>
          <input
            aria-label="Publication link"
            value={shareUrl}
            readOnly
            onFocus={(e) => e.target.select()}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
