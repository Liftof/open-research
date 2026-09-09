import { SignIn } from '@clerk/nextjs';
import { Shell } from '../../research-app';
export default function Page() {
  return (
    <Shell>
      <main id="main" className="auth-main">
        <SignIn />
      </main>
    </Shell>
  );
}
