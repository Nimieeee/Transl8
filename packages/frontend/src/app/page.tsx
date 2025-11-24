'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Film, Zap, Globe } from 'lucide-react';
import MobileNav from '@/components/MobileNav';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#2a2a38_1px,transparent_1px),linear-gradient(to_bottom,#2a2a38_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff3366] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-float" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#00d9ff] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-[#ffcc00] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-float" style={{ animationDelay: '4s' }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-5xl w-full">
          {/* Logo/Brand */}
          <div className={`text-center mb-8 sm:mb-12 ${mounted ? 'animate-slide-up opacity-0' : 'opacity-0'}`}>
            <div className="inline-block relative">
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white mb-4">
                TRANSL8
              </h1>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-[#ff3366] via-[#00d9ff] to-[#ffcc00] rounded-full" />
            </div>
          </div>

          {/* Tagline */}
          <p className={`text-center text-xl sm:text-2xl md:text-3xl font-semibold text-[var(--text-secondary)] mb-3 sm:mb-4 px-4 ${mounted ? 'animate-slide-up opacity-0 delay-200' : 'opacity-0'}`}>
            Break Language Barriers
          </p>
          <p className={`text-center text-base sm:text-lg md:text-xl text-[var(--text-muted)] mb-12 sm:mb-16 max-w-2xl mx-auto px-4 ${mounted ? 'animate-slide-up opacity-0 delay-300' : 'opacity-0'}`}>
            AI-powered video dubbing that preserves emotion, timing, and authenticity across any language
          </p>

          {/* CTA */}
          <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4 ${mounted ? 'animate-slide-up opacity-0 delay-400' : 'opacity-0'}`}>
            <Link 
              href="/dashboard"
              className="group relative px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-[#ff3366] to-[#ff4477] rounded-2xl font-bold text-lg sm:text-xl text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,51,102,0.6)] text-center"
            >
              <span className="relative z-10">Launch Studio</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff4477] to-[#ff3366] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            
            <Link 
              href="/dashboard"
              className="px-8 sm:px-10 py-4 sm:py-5 border-2 border-[var(--border-color)] rounded-2xl font-bold text-lg sm:text-xl text-[var(--text-secondary)] hover:border-[var(--accent-secondary)] hover:text-[var(--accent-secondary)] transition-all duration-300 hover:shadow-[0_0_20px_var(--glow-secondary)] text-center"
            >
              View Demo
            </Link>
          </div>

          {/* Features grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-16 sm:mt-24 px-4 ${mounted ? 'animate-fade-in opacity-0 delay-500' : 'opacity-0'}`}>
            {[
              { 
                Icon: Film,
                title: 'Cinema Quality', 
                desc: 'Professional-grade dubbing',
                color: 'from-[#ff3366] to-[#ff4477]'
              },
              { 
                Icon: Zap,
                title: 'Lightning Fast', 
                desc: 'Process in minutes',
                color: 'from-[#ffcc00] to-[#ffdd33]'
              },
              { 
                Icon: Globe,
                title: 'Any Language', 
                desc: '100+ languages supported',
                color: 'from-[#00d9ff] to-[#00eeff]'
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="group relative p-6 sm:p-8 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--accent-primary)] transition-all duration-300 hover:transform hover:-translate-y-2 shadow-lg"
              >
                <div className={`inline-flex p-3 sm:p-4 bg-gradient-to-br ${feature.color} bg-opacity-10 rounded-2xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.Icon className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-[var(--text-primary)]">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-[var(--text-muted)]">
                  {feature.desc}
                </p>
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff3366] to-transparent" />
    </div>
  );
}
