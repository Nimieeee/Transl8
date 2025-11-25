/**
 * Example Themed Component
 * 
 * This file demonstrates how to create components that work
 * seamlessly with both light and dark themes using CSS variables.
 * 
 * Copy these patterns when building new components.
 */

'use client';

import { useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

export default function ExampleThemedComponent() {
  const [status, setStatus] = useState<'completed' | 'processing' | 'failed'>('processing');

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8">
      {/* Page Container */}
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-[var(--text-primary)] mb-2">
            Themed Component Example
          </h1>
          <p className="text-[var(--text-secondary)]">
            All elements adapt automatically to light/dark theme
          </p>
        </div>

        {/* Card Example */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-[0_1px_3px_var(--shadow-color)] hover:shadow-[0_4px_12px_var(--shadow-color)] hover:border-[var(--accent-primary)] transition-all duration-300">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Card Component
          </h2>
          <p className="text-[var(--text-secondary)] mb-4">
            This card uses CSS variables for all colors. It automatically adapts to the current theme.
          </p>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[#ff4477] text-white font-bold rounded-xl hover:scale-105 transition-transform duration-300 shadow-[0_2px_8px_var(--glow-primary)]">
              Primary Button
            </button>
            <button className="px-6 py-3 bg-[var(--bg-tertiary)] border-[1.5px] border-[var(--border-color)] text-[var(--text-secondary)] font-bold rounded-xl hover:border-[var(--accent-primary)] transition-colors duration-300">
              Secondary Button
            </button>
          </div>
        </div>

        {/* Input Fields Example */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Form Inputs
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 font-mono">
                TEXT INPUT
              </label>
              <input
                type="text"
                placeholder="Enter text..."
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border-[1.5px] border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:shadow-[0_0_0_3px_var(--glow-primary)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 font-mono">
                SELECT DROPDOWN
              </label>
              <select className="w-full px-4 py-3 bg-[var(--bg-secondary)] border-[1.5px] border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:shadow-[0_0_0_3px_var(--glow-primary)] transition-all">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Badges Example */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Status Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setStatus('completed')}
              className={`px-4 py-2 rounded-full text-xs font-mono font-semibold border transition-all ${
                status === 'completed'
                  ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/50 text-green-400 [.light_&]:text-green-700'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-muted)]'
              }`}
            >
              <Check className="inline w-4 h-4 mr-1" />
              COMPLETED
            </button>
            <button
              onClick={() => setStatus('processing')}
              className={`px-4 py-2 rounded-full text-xs font-mono font-semibold border transition-all ${
                status === 'processing'
                  ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/50 text-blue-400 [.light_&]:text-blue-800'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-muted)]'
              }`}
            >
              <AlertCircle className="inline w-4 h-4 mr-1" />
              PROCESSING
            </button>
            <button
              onClick={() => setStatus('failed')}
              className={`px-4 py-2 rounded-full text-xs font-mono font-semibold border transition-all ${
                status === 'failed'
                  ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/50 text-red-400 [.light_&]:text-red-700'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-muted)]'
              }`}
            >
              <X className="inline w-4 h-4 mr-1" />
              FAILED
            </button>
          </div>
        </div>

        {/* Upload Zone Example */}
        <div className="bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] rounded-2xl p-12 text-center hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] transition-all duration-300 cursor-pointer">
          <div className="inline-flex p-4 bg-[var(--accent-primary)]/10 rounded-2xl mb-4">
            <svg className="w-12 h-12 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Drop files here
          </h3>
          <p className="text-[var(--text-muted)]">
            or click to browse
          </p>
        </div>

        {/* Grid Background Example */}
        <div className="relative h-64 rounded-2xl overflow-hidden border border-[var(--border-color)]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[var(--grid-opacity)]" />
          <div className="relative z-10 flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Engineering Grid
              </h3>
              <p className="text-[var(--text-secondary)]">
                Subtle graph paper aesthetic
              </p>
            </div>
          </div>
        </div>

        {/* Color Palette Reference */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Color Palette
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="h-20 bg-[var(--accent-primary)] rounded-xl mb-2" />
              <p className="text-xs font-mono text-[var(--text-muted)]">accent-primary</p>
            </div>
            <div>
              <div className="h-20 bg-[var(--accent-secondary)] rounded-xl mb-2" />
              <p className="text-xs font-mono text-[var(--text-muted)]">accent-secondary</p>
            </div>
            <div>
              <div className="h-20 bg-[var(--accent-tertiary)] rounded-xl mb-2" />
              <p className="text-xs font-mono text-[var(--text-muted)]">accent-tertiary</p>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Usage Example
          </h2>
          <pre className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-4 overflow-x-auto">
            <code className="text-sm text-[var(--text-primary)] font-mono">
{`// Use CSS variables in className
<div className="bg-[var(--bg-primary)]">
  <h1 className="text-[var(--text-primary)]">
    Heading
  </h1>
  <p className="text-[var(--text-secondary)]">
    Body text
  </p>
</div>`}
            </code>
          </pre>
        </div>

      </div>
    </div>
  );
}
