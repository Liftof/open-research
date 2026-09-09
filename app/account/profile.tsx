'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Shell } from '../research-app';
import { useAccount } from '../account-context';
import { registerTools } from '@/lib/webmcp';
export function Account({
  signIn,
  signOut,
}: {
  signIn: React.ReactNode;
  signOut: React.ReactNode;
}) {
  const { session, refresh, error: loadError } = useAccount();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const [continueTo, setContinueTo] = useState('/publish');
  useEffect(() => {
    const target = new URLSearchParams(location.search).get('returnTo');
    if (target && /^\/publication\/or-[a-z0-9-]+(?:#discussion)?$/.test(target))
      setContinueTo(target);
  }, []);
  async function save(
    data: { name: string; handle?: string; bio?: string; website?: string },
    create: boolean,
  ) {
    const r = await fetch('/api/account', {
      method: create ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = (await r.json()) as {
      author: import('@/lib/research').Author;
      error?: string;
    };
    if (!r.ok) throw Error(result.error || 'Could not save account.');
    await refresh();
    return result;
  }
  useEffect(
    () =>
      registerTools([
        {
          name: 'read_account',
          description: 'Read sign-in status and the current author profile.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          async execute(input) {
            if (
              !input ||
              typeof input !== 'object' ||
              Object.keys(input).length
            )
              throw Error('Expected an empty object.');
            return await refresh();
          },
        },
        {
          name: 'create_account',
          description:
            'Create an Open Research author account for the signed-in Clerk user. Requires sign-in; no password or affiliation. Returns the saved author profile. Existing accounts are returned unchanged.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 100 },
              handle: {
                type: 'string',
                minLength: 3,
                maxLength: 40,
                pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
              },
            },
            required: ['name', 'handle'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(input) {
            if (!input || typeof input !== 'object')
              throw Error('Name and handle are required.');
            const d = input as Record<string, unknown>;
            if (
              Object.keys(d).some((k) => !['name', 'handle'].includes(k)) ||
              typeof d.name !== 'string' ||
              typeof d.handle !== 'string' ||
              d.name.trim().length < 2 ||
              d.name.length > 100 ||
              d.handle.length < 3 ||
              d.handle.length > 40 ||
              !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.handle)
            )
              throw Error('Name and handle must be strings.');
            const result = await save({ name: d.name, handle: d.handle }, true);
            flushSync(() => setSaved(true));
            return result;
          },
        },
      ]),
    [],
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    const data = new FormData(e.currentTarget);
    try {
      await save(
        {
          name: String(data.get('name')),
          handle: String(data.get('handle') || ''),
          bio: String(data.get('bio') || ''),
          website: String(data.get('website') || ''),
        },
        !session?.author,
      );
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  const author = session?.author;
  return (
    <Shell>
      <main id="main" className="account-main">
        <h1>{author ? 'Account' : 'Create account'}</h1>
        {(error || loadError) && (
          <p className="error" role="alert">
            {error || loadError}
          </p>
        )}
        {!session ? (
          <p role="status">Loading account…</p>
        ) : !session.signedIn ? (
          <>{signIn}</>
        ) : (
          <>
            <form
              key={author?.id || 'new'}
              className="publish-form profile-form"
              onSubmit={submit}
            >
              <label>
                Name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  defaultValue={author?.name || session.suggestedName}
                />
              </label>
              <label>
                Username
                <input
                  name="handle"
                  required
                  readOnly={!!author}
                  minLength={3}
                  maxLength={40}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  defaultValue={author?.handle || session.suggestedHandle || ''}
                />
              </label>
              {author && (
                <>
                  <label>
                    Bio <span className="optional">optional</span>
                    <textarea
                      name="bio"
                      maxLength={500}
                      rows={3}
                      defaultValue={author.bio}
                    />
                  </label>
                  <label>
                    Website <span className="optional">optional</span>
                    <input
                      type="url"
                      name="website"
                      maxLength={2000}
                      defaultValue={author.website}
                    />
                  </label>
                </>
              )}
              <div className="account-actions">
                <button
                  type="submit"
                  disabled={busy}
                  className="button primary"
                >
                  {busy
                    ? 'Saving…'
                    : author
                      ? 'Save changes'
                      : 'Create account'}
                </button>
                {author && (
                  <a href={`/authors/${author.handle}`}>View profile ↗</a>
                )}
              </div>
              {saved && (
                <p className="success" role="status">
                  {author ? 'Saved.' : 'Account created.'}{' '}
                  <a href={continueTo}>
                    {continueTo === '/publish'
                      ? 'Publish a paper ↗'
                      : 'Back to publication ↗'}
                  </a>
                </p>
              )}
            </form>
            {author && (
              <div className="account-tools">
                <a href="/agents">API access for your agent ↗</a>
              </div>
            )}
            <div className="signout">{signOut}</div>
          </>
        )}
      </main>
    </Shell>
  );
}
