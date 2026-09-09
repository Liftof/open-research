import { Shell } from './research-app';
export default function NotFound() {
  return (
    <Shell>
      <main id="main" className="message-main">
        <p className="mono message-code">404</p>
        <h1>Page not found.</h1>
        <p>
          The link may be incorrect, or the contribution may have been
          withdrawn.
        </p>
        <a href="/" className="button primary">
          Back to publications
        </a>
      </main>
    </Shell>
  );
}
