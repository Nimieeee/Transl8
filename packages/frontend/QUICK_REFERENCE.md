# Light Theme Quick Reference

## CSS Variables

### Backgrounds
```css
var(--bg-primary)    /* Main background */
var(--bg-secondary)  /* Cards, surfaces */
var(--bg-tertiary)   /* Inputs, secondary */
```

### Text
```css
var(--text-primary)    /* Headings (AAA) */
var(--text-secondary)  /* Body text (AAA) */
var(--text-muted)      /* Metadata (AA) */
```

### Accents
```css
var(--accent-primary)    /* Pink */
var(--accent-secondary)  /* Cyan */
var(--accent-tertiary)   /* Yellow */
```

### Effects
```css
var(--border-color)   /* Borders */
var(--glow-primary)   /* Pink glow/shadow */
var(--glow-secondary) /* Cyan glow/shadow */
var(--shadow-color)   /* General shadows */
```

## Common Patterns

### Button - Primary
```tsx
<button className="px-6 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[#ff4477] text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_2px_8px_var(--glow-primary)]">
  Click Me
</button>
```

### Button - Secondary
```tsx
<button className="px-6 py-3 bg-[var(--bg-tertiary)] border-[1.5px] border-[var(--border-color)] text-[var(--text-secondary)] font-bold rounded-xl hover:border-[var(--accent-primary)] transition-colors">
  Cancel
</button>
```

### Card
```tsx
<div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-[0_1px_3px_var(--shadow-color)] hover:shadow-[0_4px_12px_var(--shadow-color)] hover:border-[var(--accent-primary)] transition-all">
  Content
</div>
```

### Input
```tsx
<input
  type="text"
  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border-[1.5px] border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:shadow-[0_0_0_3px_var(--glow-primary)] transition-all"
/>
```

### Status Badge - Completed
```tsx
<span className="px-3 py-1 rounded-full text-xs font-mono font-semibold border bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/50 text-green-400 [.light_&]:text-green-700">
  COMPLETED
</span>
```

### Upload Zone
```tsx
<div className="bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] rounded-2xl p-12 text-center hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer">
  Drop files here
</div>
```

## Theme Toggle

```tsx
import ThemeToggle from '@/components/ThemeToggle';

<ThemeToggle />
```

## Files to Reference

- **Comprehensive Guide**: `LIGHT_THEME_GUIDE.md`
- **CSS Reference**: `src/styles/theme-reference.css`
- **Example Component**: `src/components/ExampleThemedComponent.tsx`
- **Testing Guide**: `TEST_LIGHT_THEME.md`
- **Summary**: `LIGHT_THEME_SUMMARY.md`

## Key Principles

1. Always use CSS variables (never hardcode colors)
2. Test in both themes
3. Verify contrast ratios (WCAG AA minimum)
4. Use 1.5px borders in light mode for clarity
5. Modal backdrops stay dark in both themes
6. Grid should be extremely subtle in light mode
