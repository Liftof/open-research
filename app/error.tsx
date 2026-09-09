'use client';
import { Shell } from './research-app';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Shell>
      <main id="main" className="message-main">
        <h1>Could not load this page.</h1>
        <p>Please try again in a moment.</p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
        <a className="back-link" href="/">
          Back to publications
        </a>
      </main>
    </Shell>
  );
}
