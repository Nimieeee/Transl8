'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="group relative p-2 sm:p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl hover:border-[var(--accent-primary)] transition-all duration-300 hover:scale-105"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-5 h-5 sm:w-6 sm:h-6">
        <Sun 
          className={`absolute inset-0 text-[var(--text-secondary)] transition-all duration-300 ${
            theme === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
          }`}
          strokeWidth={2}
        />
        <Moon 
          className={`absolute inset-0 text-[var(--text-secondary)] transition-all duration-300 ${
            theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
          strokeWidth={2}
        />
      </div>
    </button>
  );
}
