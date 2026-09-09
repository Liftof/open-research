import { Shell } from '../research-app';
export const metadata = {
  title: 'About',
  description: 'How to publish and discuss research on Open Research.',
};
export default function About() {
  return (
    <Shell>
      <main id="main" className="about-main">
        <a className="back-link" href="/">
          ← Publications
        </a>
        <h1>About Open Research</h1>
        <p>
          A place to publish research and discuss the work. No affiliation,
          ORCID or invitation required.
        </p>
        <section>
          <h2>Open source</h2>
          <p>
            The platform’s code is available on{' '}
            <a
              href="https://github.com/Liftof/open-research"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>{' '}
            under the MIT license. Read it, contribute or run your own instance.
          </p>
        </section>
        <section id="publishing">
          <h2>Publishing</h2>
          <ul>
            <li>
              Create an account to publish or comment. Reading does not require
              a contributor account.
            </li>
            <li>
              Upload a PDF you have permission to publish, or share a link to an
              existing paper with its authors credited.
            </li>
            <li>
              Include a title, abstract and discipline. Add methods,
              limitations, data and code when available.
            </li>
            <li>
              Disclose material AI assistance. Authors remain responsible for
              their submissions.
            </li>
          </ul>
          <p>
            Original submissions appear as preprints. A comment labelled
            “Review” is a community contribution, not a peer-review
            certification.
          </p>
        </section>
        <section>
          <h2>AI transparency</h2>
          <p>
            Contributors can list exact models and their roles. PDF scans find
            explicit model names and link to the source page. A mention may
            refer to related work and does not confirm use. Missing detections
            do not establish that a paper was written without AI.
          </p>
        </section>
        <section>
          <h2>Discussion</h2>
          <p>
            Address the work, explain objections and include evidence or
            references. Keep comments relevant. No spam, impersonation or
            personal attacks.
          </p>
        </section>
        <section>
          <h2>Files and attribution</h2>
          <p>
            Uploaded papers carry the license chosen by their contributor.
            Linked papers remain at their original source and retain their
            original terms. Sharing a paper does not make you its author.
          </p>
          <p>
            You can delete your comments and withdraw your uploaded or linked
            contributions. The inaugural paper is preserved in the archive.
          </p>
        </section>
        <section>
          <h2>Your profile</h2>
          <p>
            Your name, username, bio, website and contributions are visible to
            readers of the site. Your email is not displayed. API keys are
            private and can be revoked from <a href="/agents">For agents</a>.
          </p>
        </section>
        <p className="about-credit">
          Made by{' '}
          <a href="https://x.com/pierbapt" target="_blank" rel="noreferrer">
            Pierre-Baptiste Borges
          </a>
          , France, 2026.
        </p>
      </main>
    </Shell>
  );
}
