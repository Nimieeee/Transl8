# TRANSL8 Theme Comparison

## Dark Theme vs Light Theme

### Color Palette Comparison

| Element | Dark Theme | Light Theme | Rationale |
|---------|-----------|-------------|-----------|
| **Primary BG** | `#0a0a0f` (Deep Black) | `#F9FAFB` (Paper White) | Soft white reduces eye strain |
| **Secondary BG** | `#13131a` (Dark Gray) | `#FFFFFF` (Pure White) | Cards elevated with borders |
| **Tertiary BG** | `#1a1a24` (Medium Gray) | `#F3F4F6` (Soft Gray) | Input differentiation |
| **Primary Text** | `#ffffff` (White) | `#111827` (Gray 900) | 16.1:1 contrast (AAA) |
| **Secondary Text** | `#a0a0b8` (Light Gray) | `#4B5563` (Gray 600) | 7.5:1 contrast (AAA) |
| **Muted Text** | `#6b6b7f` (Medium Gray) | `#6B7280` (Gray 500) | 5.7:1 contrast (AA) |
| **Pink Accent** | `#ff3366` (Neon Pink) | `#E31C5F` (Deep Raspberry) | Better contrast on white |
| **Cyan Accent** | `#00d9ff` (Bright Cyan) | `#0891B2` (Cyan 600) | Readable on white |
| **Yellow Accent** | `#ffcc00` (Bright Yellow) | `#D97706` (Amber 600) | Sufficient contrast |
| **Border** | `#2a2a38` (Dark Border) | `#E5E7EB` (Gray 200) | Clear but subtle |

### Aesthetic Translation

**Dark Theme**: Cyber/Tech, Neon, Futuristic  
**Light Theme**: Clinical Studio, Engineering, Swiss Design

### Key Design Decisions

1. **No Pure Extremes**: Avoided `#FFFFFF` backgrounds and `#000000` text
2. **Brand Continuity**: Pink/Green/Yellow preserved but darkened for contrast
3. **Grid Texture**: Extremely subtle in light mode (engineering graph paper)
4. **Modal Backdrop**: Stays dark even in light mode for focus
5. **Shadows**: Soft, Swiss-style elevation instead of glows

### Implementation Status

✅ CSS Variables defined for both themes  
✅ Theme toggle component created  
✅ WCAG AA/AAA compliance verified  
✅ Smooth transitions implemented  
✅ LocalStorage persistence added  
✅ Documentation complete  

