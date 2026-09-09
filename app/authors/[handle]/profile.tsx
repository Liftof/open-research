'use client';
import { useEffect, useState } from 'react';
import { Shell, PaperCard } from '../../research-app';
import {
  foundingAuthor,
  inaugural,
  type Author,
  type Paper,
} from '@/lib/research';
import { useAccount } from '../../account-context';
export function AuthorPage({ handle }: { handle: string }) {
  const [author, setAuthor] = useState<Author | null>(
      handle === foundingAuthor.handle ? foundingAuthor : null,
    ),
    [papers, setPapers] = useState<Paper[]>(
      handle === foundingAuthor.handle ? [inaugural] : [],
    ),
    [error, setError] = useState('');
  const { session } = useAccount();
  useEffect(() => {
    fetch(`/api/authors/${encodeURIComponent(handle)}`)
      .then(async (r) => {
        const d = (await r.json()) as {
          author: Author;
          papers: Paper[];
          error?: string;
        };
        if (!r.ok) throw Error(d.error || 'Could not load author.');
        setAuthor(d.author);
        setPapers(d.papers);
      })
      .catch((e) => setError(e.message));
  }, [handle]);
  return (
    <Shell>
      <main id="main" className="author-main">
        <a className="back-link" href="/">
          ← Publications
        </a>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {author ? (
          <>
            <div className="author-heading">
              <div>
                <h1>{author.name}</h1>
                <p className="author-handle">@{author.handle}</p>
              </div>
              {session?.author?.id === author.id && (
                <a href="/account">Edit profile</a>
              )}
            </div>
            {author.bio && <p className="author-bio">{author.bio}</p>}
            {author.website && (
              <a
                className="author-website"
                href={author.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {new URL(author.website).hostname} ↗
              </a>
            )}
            <div className="author-publications">
              <h2>
                Contributions <span>{papers.length}</span>
              </h2>
              {papers.length ? (
                papers.map((p) => <PaperCard key={p.id} paper={p} />)
              ) : (
                <p>No publications yet.</p>
              )}
            </div>
          </>
        ) : (
          !error && <p role="status">Loading author…</p>
        )}
      </main>
    </Shell>
  );
}
