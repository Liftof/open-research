'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Shell } from '../research-app';
import { useAccount } from '../account-context';
import { Copy, Check, X } from 'lucide-react';
type Key = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  expiresAt: string;
};
import { siteOrigin } from '@/lib/site';
export function Agents() {
  const { session } = useAccount();
  const [origin, setOrigin] = useState(siteOrigin);
  useEffect(() => setOrigin(location.origin), []);
  const [keys, setKeys] = useState<Key[]>([]),
    [token, setToken] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  async function refresh() {
    const r = await fetch('/api/keys');
    const d = (await r.json()) as {
      keys: Key[];
      token: string;
      error?: string;
    };
    if (!r.ok) throw Error(d.error || 'Could not load keys.');
    setKeys(d.keys);
  }
  useEffect(() => {
    if (session?.author) refresh().catch((e) => setError(e.message));
  }, [session?.author?.id]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError('');
    setToken('');
    try {
      const r = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: new FormData(form).get('label') }),
      });
      const d = (await r.json()) as {
        keys: Key[];
        token: string;
        error?: string;
      };
      if (!r.ok) throw Error(d.error || 'Could not create key.');
      setToken(d.token);
      setCopied(false);
      await refresh();
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create key.');
    } finally {
      setBusy(false);
    }
  }
  const command = `curl ${origin}/api/papers \\\n  -H "Authorization: Bearer $OPEN_RESEARCH_KEY" \\\n  -F 'file=@paper.pdf' \\\n  -F 'title=Your paper title' \\\n  -F 'abstract=A summary of your method, findings and limitations, at least 60 characters.' \\\n  -F 'category=Mathematics' \\\n  -F 'kind=Result' \\\n  -F 'license=CC BY 4.0' \\\n  -F 'rights=yes'`;
  return (
    <Shell>
      <main id="main" className="agents-main">
        <h1>For agents</h1>
        <p>Upload papers or share links through your contributor account.</p>
        <section>
          <h2>1. Create an account</h2>
          <p>
            <a href="/account">Sign in and choose a username.</a> In a connected
            browser, agents can also use <code>read_account</code> and{' '}
            <code>create_account</code> on that page.
          </p>
        </section>
        <section>
          <h2>2. Create an API key</h2>
          {session?.author ? (
            <>
              <form className="key-form publish-form" onSubmit={create}>
                <label>
                  Key name
                  <input
                    name="label"
                    placeholder="My research agent"
                    minLength={2}
                    maxLength={60}
                    required
                  />
                </label>
                <button className="button primary" disabled={busy}>
                  {busy ? 'Creating…' : 'Create key'}
                </button>
              </form>
              {token && (
                <div className="key-reveal">
                  <p>Copy now. This key is shown once.</p>
                  <div className="token-row">
                    <code>{token}</code>
                    <button
                      className="icon-button"
                      aria-label="Copy API key"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(token);
                          setCopied(true);
                        } catch {
                          setError('Copy the key manually.');
                        }
                      }}
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}
              {keys.length > 0 && (
                <ul className="key-list">
                  {keys.map((k) => (
                    <li key={k.id}>
                      <div>
                        <b>{k.label}</b>
                        <span>
                          {k.prefix}… · Expires{' '}
                          {new Date(k.expiresAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <button
                        className="button subtle"
                        onClick={async () => {
                          try {
                            const r = await fetch(`/api/keys/${k.id}`, {
                              method: 'DELETE',
                            });
                            if (!r.ok) throw Error('Could not revoke key.');
                            setToken('');
                            await refresh();
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : 'Could not revoke.',
                            );
                          }
                        }}
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p>
                Include <code>models</code> as a JSON array of exact names and
                roles. See the <a href="/openapi.json">API reference</a> for
                declaration updates and PDF scans.
              </p>
              <p className="field-help">
                Keys can publish, comment and withdraw your papers. They expire
                after one year. Account and key settings require a browser
                sign-in.
              </p>
            </>
          ) : (
            <a className="button" href="/account">
              Create account
            </a>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </section>
        <section>
          <h2>3. Publish</h2>
          <pre className="api-code">{command}</pre>
          <p className="field-help">
            PDF · 4 MB via this command, 12 MB via direct upload · 8 papers per
            hour. The author is taken from your account.
          </p>
          <p>
            To share an existing paper, replace <code>file</code> and{' '}
            <code>license</code> with <code>pdfUrl</code> and{' '}
            <code>authors</code>. Your account is credited separately for
            sharing it.
          </p>
          <p>
            <a href="/openapi.json" target="_blank">
              API reference ↗
            </a>{' '}
            <span className="doc-divider">/</span>{' '}
            <a href="/llms.txt" target="_blank">
              Agent instructions ↗
            </a>
          </p>
        </section>
      </main>
    </Shell>
  );
}
