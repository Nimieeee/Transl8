'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Home, FolderOpen, Plus } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface MobileNavProps {
  onCreateProject?: () => void;
}

export default function MobileNav({ onCreateProject }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: FolderOpen, label: 'Projects', path: '/dashboard' },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Navigation Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-[var(--accent-primary)] transition-all duration-300 lg:hidden touch-manipulation active:scale-95"
        aria-label="Toggle navigation"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-[var(--text-primary)]" />
        ) : (
          <Menu className="w-6 h-6 text-[var(--text-primary)]" />
        )}
      </button>

      {/* Theme Toggle - Desktop */}
      <div className="fixed top-4 right-4 z-50 hidden lg:block">
        <ThemeToggle />
      </div>

      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-0 left-0 w-80 max-w-[85vw] h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] shadow-2xl animate-slide-in-left">
            <div className="p-6 pt-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-[var(--text-primary)]">
                  TRANSL8
                </h2>
                <ThemeToggle />
              </div>
              
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 touch-manipulation active:scale-95 ${
                      pathname === item.path
                        ? 'bg-[var(--accent-primary)] text-white shadow-lg'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="font-semibold text-base">{item.label}</span>
                  </button>
                ))}
                
                {onCreateProject && (
                  <button
                    onClick={() => {
                      onCreateProject();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[#ff4477] text-white font-semibold hover:scale-105 transition-transform duration-300 mt-4 touch-manipulation active:scale-95"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-base">New Project</span>
                  </button>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
