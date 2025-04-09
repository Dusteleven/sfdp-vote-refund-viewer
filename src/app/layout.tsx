import './globals.css';
import { Metadata } from 'next';
import ThemeClientLayout from './ThemeClientLayout';
import { FirebaseProvider } from '@/lib/context/FirebaseProvider';

export const metadata: Metadata = {
  title: 'Solana Epoch Refund Tracker',
  description: 'Track validator reward refunds by epoch',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <FirebaseProvider>
          <ThemeClientLayout>{children}</ThemeClientLayout>
        </FirebaseProvider>
      </body>
    </html>
  );
}
