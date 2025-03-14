import './globals.css';
import Header from './components/Header';
import { Analytics } from '@vercel/analytics/react';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'inspector/promises';
import EmailContextProvider from './contexts/EmailContext';

export const metadata = {
  title: 'Next.js App Router + NextAuth + Tailwind CSS',
  description:
    'A user admin dashboard configured with Next.js, Postgres, NextAuth, Tailwind CSS, TypeScript, and Prettier.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col max-h-screen">
        <SessionProvider>
          <EmailContextProvider>
            <Header />
            {children}
          </EmailContextProvider>
        </SessionProvider>
      </body>
      <Analytics />
    </html>
  );
}
