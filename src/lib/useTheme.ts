'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('light'); // default 'light' for SSR

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    setTheme(
      stored === 'dark' || stored === 'light'
        ? stored
        : systemPrefersDark
        ? 'dark'
        : 'light'
    );

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  return { theme, setTheme, mounted };
}
