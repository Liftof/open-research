import { SignOutButton } from '@clerk/nextjs';
import { Account } from './profile';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Account' };
export default function Page() {
  return (
    <Account
      signIn={
        <a className="button primary" href="/sign-in">
          Sign in / Sign up
        </a>
      }
      signOut={
        <SignOutButton redirectUrl="/">
          <button className="text-button">Sign out</button>
        </SignOutButton>
      }
    />
  );
}
