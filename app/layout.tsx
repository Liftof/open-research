import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AccountProvider } from './account-context';
const sans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
export const metadata: Metadata = {
  title: {
    default: 'Open Research — Scientific contributions',
    template: '%s · Open Research',
  },
  icons: { icon: '/favicon.svg' },
  description: 'Scientific contributions, sources and discussion.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: '#254de8',
              fontFamily: 'var(--font-geist-sans)',
              borderRadius: '4px',
            },
          }}
        >
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <AccountProvider>{children}</AccountProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
