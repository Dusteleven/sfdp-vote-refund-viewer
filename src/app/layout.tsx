import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeClientLayout from './ThemeClientLayout';
import { FirebaseProvider } from '@/lib/context/FirebaseProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Solana Epoch Refund Tracker',
  description: 'Track validator reward refunds across Solana epochs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <FirebaseProvider>
          <ThemeClientLayout>{children}</ThemeClientLayout>
        </FirebaseProvider>
      </body>
    </html>
  );
}
