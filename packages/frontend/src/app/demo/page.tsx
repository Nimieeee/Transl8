'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import MobileNav from '@/components/MobileNav';

export default function DemoPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingTranslated, setPlayingTranslated] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[var(--grid-opacity)]" />
      
      {/* Header */}
      <div className="relative z-10 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 md:py-6 pl-16 lg:pl-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors mb-2 sm:mb-3 md:mb-4 group min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-xs sm:text-sm">Back to Home</span>
          </button>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-tight text-[var(--text-primary)] mb-1.5 sm:mb-2">
              Live Demo
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] font-mono">
              See TRANSL8 in action - English to Spanish dubbing
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Original Video */}
          <div className={`bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl p-4 sm:p-6 ${mounted ? 'animate-slide-up opacity-0' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-[#00d9ff]/20 to-[#00d9ff]/5 rounded-xl border border-[#00d9ff]/30">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d9ff]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Original</h2>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] font-mono">English</p>
              </div>
            </div>
            
            <div className="relative aspect-video bg-[var(--bg-tertiary)] rounded-xl overflow-hidden">
              <video
                controls
                className="w-full h-full"
                onPlay={() => setPlayingOriginal(true)}
                onPause={() => setPlayingOriginal(false)}
              >
                <source src="/demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="mt-4 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg">
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Original Audio:</span> English narration demonstrating the translation capabilities
              </p>
            </div>
          </div>

          {/* Translated Video */}
          <div className={`bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl p-4 sm:p-6 ${mounted ? 'animate-slide-up opacity-0 delay-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-[#ff3366]/20 to-[#ff3366]/5 rounded-xl border border-[#ff3366]/30">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-[#ff3366]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Translated</h2>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] font-mono">Spanish</p>
              </div>
            </div>
            
            <div className="relative aspect-video bg-[var(--bg-tertiary)] rounded-xl overflow-hidden">
              <video
                controls
                className="w-full h-full"
                onPlay={() => setPlayingTranslated(true)}
                onPause={() => setPlayingTranslated(false)}
              >
                <source src="/output.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="mt-4 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg">
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Dubbed Audio:</span> AI-generated Spanish voice with matched timing and lip-sync
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className={`mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 ${mounted ? 'animate-fade-in opacity-0 delay-200' : 'opacity-0'}`}>
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
            <div className="text-2xl sm:text-3xl font-black text-[var(--accent-primary)] mb-2">Synced</div>
            <p className="text-sm text-[var(--text-secondary)]">Perfect timing match</p>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
            <div className="text-2xl sm:text-3xl font-black text-[var(--accent-secondary)] mb-2">Natural</div>
            <p className="text-sm text-[var(--text-secondary)]">Conversational flow</p>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
            <div className="text-2xl sm:text-3xl font-black text-[var(--accent-tertiary)] mb-2">Cinema</div>
            <p className="text-sm text-[var(--text-secondary)]">Professional quality</p>
          </div>
        </div>

        {/* CTA */}
        <div className={`mt-8 sm:mt-12 text-center ${mounted ? 'animate-slide-up opacity-0 delay-300' : 'opacity-0'}`}>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-[#ff3366] to-[#ff4477] rounded-2xl font-bold text-lg sm:text-xl text-white hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,51,102,0.4)]"
          >
            Try It Yourself
          </button>
        </div>
      </div>
    </div>
  );
}
