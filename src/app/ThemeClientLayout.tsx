'use client';

import Link from 'next/link';
import { useTheme } from '@/lib/useTheme';

export default function ThemeClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) return null;

  return (
    <div className={theme}>
      <header className='w-full p-4 border-b border-muted flex justify-between items-center bg-background sticky top-0 z-50'>
        <nav className='flex gap-6 items-center text-sm font-medium'>
          <Link
            href='/'
            className='text-foreground hover:underline hover:text-blue-500 transition'>
            Epoch Overview
          </Link>
          <Link
            href='/search'
            className='text-foreground hover:underline hover:text-blue-500 transition'>
            Validator Search
          </Link>
        </nav>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className='text-xs bg-muted text-muted-foreground px-3 py-1 rounded hover:opacity-80'>
          {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
        </button>
      </header>
      <main className='p-4 max-w-7xl mx-auto'>{children}</main>
    </div>
  );
}
