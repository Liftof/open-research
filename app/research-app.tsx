'use client';
import { siteOrigin } from '@/lib/site';
import { upload } from '@vercel/blob/client';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ModelTransparency,
  ModelFields,
  PaperActions,
} from './paper-transparency';
import type { ModelUse } from '@/lib/models';
import { useAccount, AccountGate } from './account-context';
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  FileText,
  MessageSquare,
  Download,
  Copy,
  Check,
  ExternalLink,
  X,
  Code2,
  Upload,
  Link2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  inaugural,
  categories,
  kinds,
  citation,
  dateLabel,
  type Paper,
  type Comment,
} from '@/lib/research';

function Header() {
  const { session } = useAccount();
  return (
    <header className="site-header">
      <div className="header-identity">
        <a href="/" className="brand" aria-label="Open Research, home">
          <span className="brand-mark">
            o<span>/</span>r
          </span>
          <span>
            open
            <br />
            research<span className="brand-dot">.</span>
          </span>
        </a>
        <p className="header-description">
          An open-source platform for scientific contributions. Anyone can
          publish.
        </p>
      </div>
      <nav aria-label="Main navigation">
        <a className="nav-explore" href="/">
          Publications
        </a>
        <a href="/agents" className="nav-agents">
          For agents
        </a>
        <a
          href={session?.author ? '/account' : '/login'}
          className="nav-account"
        >
          {session?.author ? 'Account' : 'Sign in'}
        </a>
        <a className="button primary" href="/publish">
          <Plus size={18} /> Publish
        </a>
      </nav>
    </header>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <footer className="site-footer">
        <a href="/" className="footer-name">
          Open Research
        </a>
        <nav aria-label="Footer navigation">
          <a
            className="footer-source"
            href="https://github.com/Liftof/open-research"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={16} /> Open source
          </a>
          <a href="/about">About</a>
          <a href="/about#publishing">Publishing guidelines</a>
          <a href="/agents">For agents</a>
        </nav>
        <p className="footer-credit">
          Made by{' '}
          <a href="https://x.com/pierbapt" target="_blank" rel="noreferrer">
            Pierre-Baptiste Borges
          </a>
          , France, 2026.
        </p>
      </footer>
    </>
  );
}
export function ResearchApp({ initialPapers }: { initialPapers: Paper[] }) {
  const [papers, setPapers] = useState<Paper[]>(initialPapers);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(location.search);
      setQuery(params.get('q') || '');
      setCategory(
        categories.includes(params.get('category') || '')
          ? params.get('category')!
          : 'All',
      );
    };
    restore();
    addEventListener('popstate', restore);
    return () => removeEventListener('popstate', restore);
  }, []);
  function filter(nextCategory: string, nextQuery: string) {
    setCategory(nextCategory);
    setQuery(nextQuery);
    const params = new URLSearchParams();
    if (nextCategory !== 'All') params.set('category', nextCategory);
    if (nextQuery) params.set('q', nextQuery);
    history.replaceState(null, '', '/' + (params.size ? `?${params}` : ''));
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/papers', { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<{ papers: Paper[] }>;
      })
      .then((d) => {
        setPapers(d.papers);
        setError('');
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Could not refresh publications.');
      });
    return () => controller.abort();
  }, [retry]);
  const filtered = papers.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      `${p.title} ${p.author} ${p.abstract}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <Shell>
      <main id="main" className="index-main">
        <div className="page-heading">
          <div>
            <h1>Publications</h1>
          </div>
          <label className="search">
            <Search size={18} />
            <input
              placeholder="Search…"
              value={query}
              onChange={(e) => filter(category, e.target.value)}
              aria-label="Search publications"
            />
            {query && (
              <button
                onClick={() => filter(category, '')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>
        </div>
        <Tabs
          value={category}
          onValueChange={(v) => filter(String(v), query)}
          className="category-tabs"
        >
          <TabsList
            className="category-list"
            variant="line"
            aria-label="Disciplines"
          >
            {categories.map((c) => {
              return (
                <TabsTrigger className="category-tab" key={c} value={c}>
                  {c}
                  <span className="category-count">
                    {c === 'All'
                      ? papers.length
                      : papers.filter((p) => p.category === c).length}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {categories.map((c) => (
            <TabsContent value={c} key={c}>
              <div className="index-columns">
                <section aria-label="Search results">
                  {error && (
                    <p role="alert" className="error">
                      {error}{' '}
                      <button
                        className="text-button"
                        onClick={() => setRetry(retry + 1)}
                      >
                        Try again
                      </button>
                    </p>
                  )}
                  {filtered.map((p) => (
                    <PaperCard key={p.id} paper={p} />
                  ))}
                  {filtered.length === 0 && (
                    <div className="empty-state">
                      <Search size={30} />
                      <h2>{query ? 'No results.' : 'No publications.'}</h2>
                      {query ? (
                        <button
                          className="button"
                          onClick={() => {
                            filter('All', '');
                          }}
                        >
                          Clear filters
                        </button>
                      ) : (
                        <a className="button primary" href="/publish">
                          Publish a paper <ArrowUpRight size={16} />
                        </a>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </Shell>
  );
}
export function PaperCard({ paper: p }: { paper: Paper }) {
  return (
    <article className="paper-card">
      <div className="paper-meta mono">
        <span className="tag blue">{p.category}</span>
        <span>{p.kind}</span>
        {p.shared && (
          <span className="shared-label">
            <Link2 size={13} /> Shared paper
          </span>
        )}
        <time className="paper-date" dateTime={p.createdAt}>
          {dateLabel(p.createdAt)}
        </time>
      </div>
      <div className="paper-card-body">
        <div>
          <a className="paper-title-link" href={`/publication/${p.id}`}>
            <h2>{p.title}</h2>
          </a>
          <p className="paper-excerpt">{p.abstract}</p>
        </div>
      </div>
      <ModelTransparency paper={p} />
      <div className="paper-bottom">
        <span className="paper-author">
          <AuthorLink handle={p.authorHandle} name={p.author} />
        </span>
        <a href={`/publication/${p.id}#discussion`} className="comment-link">
          <MessageSquare size={16} />
          {p.comments}
          <span className="sr-only">
            {p.comments === 1 ? ' comment' : ' comments'}
          </span>
        </a>
        <PaperActions paper={p} />
        <a className="read-link" href={`/publication/${p.id}`}>
          Read <ArrowRight size={17} />
        </a>
      </div>
    </article>
  );
}
export function Publication({
  id,
  initialPaper,
}: {
  id: string;
  initialPaper: Paper;
}) {
  const [paper, setPaper] = useState<Paper | null>(initialPaper);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [tab, setTab] = useState('article');
  async function refresh() {
    const r = await fetch(`/api/papers/${id}`);
    const data = (await r.json()) as {
      paper: Paper;
      comments: Comment[];
      error?: string;
    };
    if (!r.ok) throw Error(data.error || 'Publication not found.');
    setPaper(data.paper);
    setComments(data.comments);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const syncTab = () =>
      setTab(location.hash === '#discussion' ? 'discussion' : 'article');
    syncTab();
    addEventListener('hashchange', syncTab);
    return () => removeEventListener('hashchange', syncTab);
  }, [id]);
  const p = paper;
  const first = id === inaugural.id;
  async function copyCitation() {
    if (!p) return;
    try {
      await navigator.clipboard.writeText(citation(p, location.origin));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy. Select the reference in Cite instead.');
    }
  }
  return (
    <Shell>
      <main id="main" className="detail-main">
        <a href="/" className="back-link">
          <ArrowLeft size={16} /> All publications
        </a>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!p ? (
          <p role="status">{error ? '' : 'Loading publication…'}</p>
        ) : (
          <>
            <div className="detail-kicker mono">
              <span className="tag blue">{p.category}</span>
              <span>{p.shared ? 'Shared paper' : 'Preprint · V1'}</span>
              <span>{p.kind}</span>
            </div>
            <h1 className="detail-title">{p.title}</h1>
            <div className="detail-byline">
              <span className="avatar">
                {p.author
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div>
                <b>
                  <AuthorLink handle={p.authorHandle} name={p.author} />
                </b>
                <span>
                  {p.shared ? 'Shared' : 'Posted'} {dateLabel(p.createdAt)}
                  {p.publishedAt
                    ? ` · Manuscript: ${dateLabel(p.publishedAt)}`
                    : ''}
                </span>
                {p.sharedBy && (
                  <span>
                    Shared by{' '}
                    <AuthorLink handle={p.sharedByHandle} name={p.sharedBy} />
                  </span>
                )}
              </div>
            </div>
            <div className="detail-transparency">
              <ModelTransparency paper={p} />
            </div>
            <div className="mobile-paper-access">
              <a
                className="button primary"
                href={p.pdfUrl}
                target="_blank"
                rel="noopener"
              >
                Open PDF <ArrowUpRight size={17} />
              </a>
              {p.pages && <span>{p.pages} pages</span>}
            </div>
            <div className="detail-columns">
              <div>
                <Tabs
                  value={tab}
                  onValueChange={(v) => {
                    setTab(String(v));
                    history.replaceState(
                      null,
                      '',
                      v === 'discussion' ? '#discussion' : location.pathname,
                    );
                  }}
                >
                  <TabsList variant="line" className="detail-tabs">
                    <TabsTrigger value="article">Publication</TabsTrigger>
                    <TabsTrigger value="discussion">
                      Discussion{' '}
                      <span className="tab-count">{comments.length}</span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="article" className="article-content">
                    <section>
                      <h2>Abstract</h2>
                      <p>{p.abstract}</p>
                    </section>
                    {first && (
                      <section>
                        <h2>Results</h2>
                        <div className="results-grid">
                          <div>
                            <span className="result-formula">
                              e<sub>S</sub>(7) &lt; u<sub>S</sub>(7)
                            </span>
                            <p>
                              On the 64 × 64 grid: 5 compatible additions,
                              compared with 6 individually admissible points.
                            </p>
                          </div>
                          <div>
                            <span className="result-formula">164 → ≤161</span>
                            <p>
                              Every addition-and-removal path to another equally
                              large configuration must drop to 161 points or
                              fewer.
                            </p>
                          </div>
                        </div>
                      </section>
                    )}
                    {p.method && (
                      <section>
                        <h2>Method</h2>
                        <p>{p.method}</p>
                      </section>
                    )}
                    {p.limitations && (
                      <section className="limits-block">
                        <h2>Limitations</h2>
                        <p>{p.limitations}</p>
                      </section>
                    )}
                    {p.aiUse && (
                      <section className="disclosure">
                        <h2>AI disclosure</h2>
                        <p>{p.aiUse}</p>
                      </section>
                    )}
                  </TabsContent>
                  <TabsContent
                    id="discussion"
                    value="discussion"
                    className="discussion-content"
                  >
                    <CommentForm id={id} onAdded={refresh} />
                    <div className="comments-list">
                      {comments.length === 0 ? (
                        <div className="no-comments">
                          <p>No comments.</p>
                        </div>
                      ) : (
                        comments.map((c) => (
                          <article className="comment" key={c.id}>
                            <div className="comment-top">
                              <b>
                                <AuthorLink
                                  handle={c.authorHandle}
                                  name={c.author}
                                />
                              </b>
                              <span className="tag">{c.kind}</span>
                              <time>{dateLabel(c.createdAt)}</time>
                              {c.mine && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const r = await fetch(
                                        `/api/comments/${c.id}`,
                                        { method: 'DELETE' },
                                      );
                                      if (!r.ok) throw Error();
                                      await refresh();
                                    } catch {
                                      setError(
                                        'Could not delete this comment.',
                                      );
                                    }
                                  }}
                                  className="delete-comment"
                                  aria-label="Delete my comment"
                                >
                                  <X size={15} />
                                </button>
                              )}
                            </div>
                            <p>{c.body}</p>
                          </article>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <aside className="paper-sidebar">
                <div className="download-panel">
                  <FileText size={30} strokeWidth={1.3} />
                  <p>
                    {p.pages ? `${p.pages} pages · PDF` : 'PDF'}
                    {p.shared ? ' · Original source' : ''}
                  </p>
                  <a
                    className="button primary"
                    href={p.pdfUrl}
                    target="_blank"
                    rel="noopener"
                  >
                    Open PDF <ArrowUpRight size={17} />
                  </a>
                  {!p.shared && (
                    <a
                      href={
                        p.pdfUrl.startsWith('/api/')
                          ? `${p.pdfUrl}?download=1`
                          : p.pdfUrl
                      }
                      download
                      className="download-link"
                    >
                      <Download size={15} /> Download
                    </a>
                  )}
                </div>
                <dl className="paper-facts">
                  <div>
                    <dt>STATUS</dt>
                    <dd>
                      Preprint
                      <br />
                      <span>
                        {p.shared
                          ? 'Review status not verified'
                          : 'Not peer reviewed'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>LICENSE</dt>
                    <dd>
                      {p.shared ? (
                        <a
                          href={p.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          See original ↗
                        </a>
                      ) : (
                        p.license
                      )}
                    </dd>
                  </div>
                </dl>
                {p.sourceUrl && (
                  <a
                    href={p.sourceUrl}
                    className="source-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Code2 size={18} />{' '}
                    {p.shared ? 'Supporting materials' : 'Code & sources'}{' '}
                    <ExternalLink size={15} />
                  </a>
                )}
                {first && (
                  <a
                    href="/papers/local-exchange-profiles-source.tar.gz"
                    download
                    className="source-link"
                  >
                    <Download size={17} /> LaTeX source
                  </a>
                )}
                <Dialog>
                  <DialogTrigger className="source-link">
                    <Copy size={17} /> Cite
                  </DialogTrigger>
                  <DialogContent className="cite-dialog">
                    <DialogTitle>Cite</DialogTitle>
                    <DialogDescription>BibTeX</DialogDescription>
                    <pre>
                      {citation(
                        p,
                        typeof window !== 'undefined'
                          ? location.origin
                          : siteOrigin,
                      )}
                    </pre>
                    <button className="button primary" onClick={copyCitation}>
                      {copied ? <Check size={17} /> : <Copy size={17} />}{' '}
                      {copied ? 'Copied' : 'Copy citation'}
                    </button>
                  </DialogContent>
                </Dialog>
                <button
                  className="source-link"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${location.origin}/publication/${p.id}`,
                      );
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2500);
                    } catch {
                      setError(
                        'Could not copy the link. Copy it from your address bar.',
                      );
                    }
                  }}
                >
                  {linkCopied ? <Check size={17} /> : <Link2 size={17} />}
                  {linkCopied ? 'Link copied' : 'Copy link'}
                </button>
                {p.mine && !first && <Withdraw id={id} />}
              </aside>
            </div>
          </>
        )}
      </main>
    </Shell>
  );
}
function Withdraw({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className="withdraw-link">
        Withdraw publication
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Withdraw this publication?</AlertDialogTitle>
        <AlertDialogDescription>
          This contribution will be removed from Open Research. Files hosted
          here will be deleted. External source files are unaffected.
        </AlertDialogDescription>
        {error && <p role="alert">{error}</p>}
        <button
          className="button"
          onClick={async () => {
            const r = await fetch(`/api/papers/${id}`, { method: 'DELETE' });
            if (r.ok) location.href = '/';
            else setError('Could not withdraw. Try again.');
          }}
        >
          Withdraw
        </button>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function CommentForm({
  id,
  onAdded,
}: {
  id: string;
  onAdded: () => Promise<void>;
}) {
  const [kind, setKind] = useState('Question');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const data = new FormData(form);
      const r = await fetch(`/api/papers/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: data.get('body'),
          kind,
        }),
      });
      const d = (await r.json()) as { error?: string; paper: { id: string } };
      if (!r.ok) throw Error(d.error || 'Could not post your comment.');
      form.reset();
      await onAdded();
      setSuccess('Comment posted.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post your comment.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountGate returnTo={`/publication/${id}#discussion`}>
      <form className="comment-form" onSubmit={submit}>
        <div className="form-row">
          <label>
            Comment type
            <Select value={kind} onValueChange={(v) => setKind(String(v))}>
              <SelectTrigger className="form-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Question', 'Review', 'Reproduction', 'Discussion'].map(
                  (k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </label>
        </div>
        <label className="sr-only" htmlFor="comment-body">
          Your comment
        </label>
        <textarea
          id="comment-body"
          name="body"
          required
          minLength={5}
          maxLength={4000}
          rows={4}
          placeholder="Comment"
        />
        <div className="comment-form-bottom">
          <button disabled={busy} className="button primary" type="submit">
            {busy ? 'Posting…' : 'Post comment'}
            <ArrowUpRight size={16} />
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="success">
            {success}
          </p>
        )}
      </form>
    </AccountGate>
  );
}
export function Publish() {
  const { session } = useAccount();
  const [category, setCategory] = useState('Mathematics');
  const [kind, setKind] = useState('Result');
  const [license, setLicense] = useState('All rights reserved');
  const [agreed, setAgreed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState('upload');
  const [models, setModels] = useState<ModelUse[]>([]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (mode === 'upload' && !file) return setError('Add a PDF to publish.');
    if (mode === 'upload' && !agreed)
      return setError('Confirm you have permission to publish this work.');
    setBusy(true);
    try {
      const data = new FormData(e.currentTarget);
      data.set('category', category);
      data.set('kind', kind);
      data.set('license', license);
      data.set('rights', 'yes');
      data.set('models', JSON.stringify(models));
      if (mode === 'upload' && file) {
        const uploaded = await upload(
          `papers/${crypto.randomUUID()}.pdf`,
          file,
          {
            access: 'private',
            handleUploadUrl: '/api/uploads',
            contentType: 'application/pdf',
          },
        );
        data.delete('file');
        data.set('uploadedPath', uploaded.pathname);
      }
      const r = await fetch('/api/papers', { method: 'POST', body: data });
      const d = (await r.json()) as { error?: string; paper: { id: string } };
      if (!r.ok) throw Error(d.error || 'Upload failed.');
      location.href = `/publication/${d.paper.id}`;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Upload failed. Your fields have been kept.',
      );
      setBusy(false);
    }
  }
  function chooseFile(f: File | undefined) {
    setError('');
    if (!f) return;
    setFile(null);
    if (!f.name.toLowerCase().endsWith('.pdf'))
      return setError('Choose a PDF file.');
    if (f.size > 12 * 1024 * 1024)
      return setError('The PDF must be under 12 MB.');
    setFile(f);
  }
  return (
    <Shell>
      <main id="main" className="publish-main">
        <a className="back-link" href="/">
          <ArrowLeft size={16} /> Back to publications
        </a>
        <div className="publish-heading">
          <h1>Publish</h1>
        </div>
        <div className="publish-columns">
          <AccountGate>
            <form onSubmit={submit} className="publish-form">
              <Tabs
                value={mode}
                onValueChange={(v) => {
                  setMode(String(v));
                  setError('');
                }}
              >
                <TabsList variant="line" aria-label="Contribution format">
                  <TabsTrigger value="upload">Upload a paper</TabsTrigger>
                  <TabsTrigger value="link">Share a link</TabsTrigger>
                </TabsList>
              </Tabs>
              {mode === 'link' ? (
                <>
                  <label>
                    PDF URL
                    <input
                      name="pdfUrl"
                      type="url"
                      required
                      maxLength={2000}
                      placeholder="https://…/paper.pdf"
                    />
                  </label>
                  <label>
                    Authors
                    <input
                      name="authors"
                      required
                      minLength={2}
                      maxLength={240}
                      placeholder="As credited in the paper"
                    />
                  </label>
                  <p className="field-help">
                    The PDF stays at its original source. Your account is
                    credited for sharing it.
                  </p>
                </>
              ) : (
                <label
                  className={`upload-zone ${file ? 'has-file' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    chooseFile(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="file-input"
                    aria-label="Add PDF"
                    onChange={(e) => chooseFile(e.target.files?.[0])}
                  />
                  {file ? <FileText size={30} /> : <Upload size={30} />}
                  <strong>{file ? file.name : 'Add a PDF'}</strong>
                  <span>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace`
                      : '12 MB maximum'}
                  </span>
                </label>
              )}
              <label>
                Title
                <input name="title" required minLength={8} maxLength={240} />
              </label>
              <p className="posting-as">
                {mode === 'link' ? 'Shared by:' : 'Author:'}{' '}
                <a href={`/authors/${session?.author?.handle}`}>
                  {session?.author?.name}
                </a>
              </p>
              <div className="form-row">
                <label>
                  Discipline
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(String(v))}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label>
                  Type
                  <Select
                    value={kind}
                    onValueChange={(v) => setKind(String(v))}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kinds.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <label>
                Abstract
                <textarea
                  name="abstract"
                  required
                  minLength={60}
                  maxLength={12000}
                  rows={5}
                  placeholder="At least 60 characters"
                />
              </label>
              <fieldset className="model-declaration">
                <legend>
                  AI models & tools{' '}
                  <span className="optional-label">optional</span>
                </legend>
                <p className="field-help">
                  List exact versions when known. Explicit PDF mentions are
                  detected separately.
                </p>
                <ModelFields models={models} onChange={setModels} />
              </fieldset>
              <button
                className="expand-form"
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <X size={17} /> : <Plus size={17} />} Method,
                limitations & sources <span>optional</span>
              </button>
              <div hidden={!expanded} className="extra-fields">
                <div className="form-row">
                  <label>
                    Manuscript date
                    <input
                      name="publishedAt"
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </label>
                  <label>
                    Pages
                    <input name="pages" type="number" min="1" max="100000" />
                  </label>
                </div>
                <label>
                  Method
                  <textarea name="method" maxLength={5000} rows={3} />
                </label>
                <label>
                  Limitations
                  <textarea name="limitations" maxLength={5000} rows={3} />
                </label>
                <label>
                  Code, data or sources
                  <input
                    name="sourceUrl"
                    type="url"
                    placeholder="https://…"
                    maxLength={2000}
                  />
                </label>
                <label>
                  AI disclosure
                  <textarea name="aiUse" maxLength={2000} rows={3} />
                </label>
              </div>
              {mode === 'upload' && (
                <>
                  <label>
                    License
                    <Select
                      value={license}
                      onValueChange={(v) => setLicense(String(v))}
                    >
                      <SelectTrigger className="form-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['All rights reserved', 'CC BY 4.0', 'CC0'].map(
                          (c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <span className="field-help">
                      {license === 'CC BY 4.0'
                        ? 'Reuse allowed with attribution.'
                        : license === 'CC0'
                          ? 'You waive copyright to the extent allowed by law.'
                          : 'Reading allowed here. Reuse requires your permission.'}
                    </span>
                  </label>
                  <label className="rights-check">
                    <Checkbox
                      checked={agreed}
                      onCheckedChange={setAgreed}
                      required
                      aria-label="I have permission to publish this work"
                    />
                    <span>I have permission to publish this document.</span>
                  </label>
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="button primary publish-submit"
              >
                {busy
                  ? 'Publishing…'
                  : mode === 'link'
                    ? 'Share paper'
                    : 'Publish'}
                <ArrowUpRight size={18} />
              </button>
            </form>
          </AccountGate>
        </div>
      </main>
    </Shell>
  );
}

export function AuthorLink({
  handle,
  name,
}: {
  handle?: string;
  name: string;
}) {
  return handle ? (
    <a className="author-link" href={`/authors/${handle}`}>
      {name}
    </a>
  ) : (
    <>{name}</>
  );
}
