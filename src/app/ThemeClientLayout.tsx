'use client';

import type React from 'react';

import Link from 'next/link';
import { useTheme } from '@/lib/useTheme';
import { Moon, Sun, Home, Search } from 'lucide-react';

export default function ThemeClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) return null;

  return (
    <div className={`${theme} min-h-screen flex flex-col`}>
      <header className='w-full py-4 px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 bg-opacity-80 dark:bg-opacity-80 backdrop-blur-sm sticky top-0 z-50 shadow-sm'>
        <div className='max-w-7xl mx-auto w-full flex justify-between items-center'>
          <div className='flex items-center gap-2'>
            <div className='font-bold text-lg text-gray-900 dark:text-white mr-6'>
              <Link
                href='/'
                className='hover:opacity-80 transition-opacity flex items-center gap-2'>
                <span className='bg-blue-600 text-white p-1 rounded text-xs'>
                  SOL
                </span>
                <span>Epoch Tracker</span>
              </Link>
            </div>

            <nav className='hidden sm:flex gap-6 items-center text-sm font-medium'>
              <Link
                href='/'
                className='text-gray-900 dark:text-gray-100 hover:text-blue-500 transition-colors flex items-center gap-1.5'>
                <Home size={16} />
                <span>Epoch Overview</span>
              </Link>
              <Link
                href='/search'
                className='text-gray-900 dark:text-gray-100 hover:text-blue-500 transition-colors flex items-center gap-1.5'>
                <Search size={16} />
                <span>Validator Search</span>
              </Link>
            </nav>
          </div>

          <div className='flex items-center gap-4'>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className='flex items-center justify-center h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div className='flex-1 w-full'>{children}</div>

      <footer className='w-full py-6 px-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950'>
        <div className='max-w-7xl mx-auto w-full'>
          <div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
            <div className='text-sm text-gray-500 dark:text-gray-400'>
              © {new Date().getFullYear()} Solana Epoch Refund Tracker
            </div>
            <div className='flex gap-6 text-sm'>
              <Link
                href='/'
                className='text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'>
                Home
              </Link>
              <Link
                href='/search'
                className='text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'>
                Search
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
