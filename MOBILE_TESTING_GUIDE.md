# Mobile Testing Guide

## Quick Test Instructions

### 1. Start the Development Server
```bash
cd packages/frontend
npm run dev
```

### 2. Test on Real Devices

#### Using Your Phone
1. Find your computer's local IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Access from your phone's browser:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   Example: `http://192.168.1.100:3000`

3. Make sure your phone and computer are on the same WiFi network

### 3. Test Using Browser DevTools

#### Chrome DevTools
1. Open Chrome
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Click the device toolbar icon (or press `Cmd+Shift+M` / `Ctrl+Shift+M`)
4. Select different devices from the dropdown:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPhone 14 Pro Max (430px)
   - iPad (768px)
   - iPad Pro (1024px)

#### Firefox Responsive Design Mode
1. Open Firefox
2. Press `Cmd+Option+M` (Mac) / `Ctrl+Shift+M` (Windows)
3. Select device presets or enter custom dimensions

### 4. What to Test

#### Mobile (< 640px)
✅ **Navigation**
- Hamburger menu appears in top-left
- Menu slides in smoothly from left
- Backdrop blur works
- Menu closes when clicking outside
- Navigation items are easily tappable

✅ **Layout**
- No horizontal scrolling
- Content stacks vertically
- Cards display in single column
- Text is readable without zooming
- Images scale properly

✅ **Modals**
- Slide up from bottom (not centered)
- Rounded top corners
- Full width on mobile
- Easy to dismiss

✅ **Forms**
- Inputs don't trigger zoom on iOS
- Touch targets are large enough
- Labels are readable
- Buttons are easy to tap

✅ **Typography**
- Minimum 16px font size
- Good line spacing
- Text wraps properly
- No text overflow

#### Tablet (640px - 1024px)
✅ **Layout**
- 2-column grid for project cards
- Proper spacing between elements
- Modals center on screen
- Navigation transitions smoothly

#### Desktop (> 1024px)
✅ **Layout**
- 3-column grid for project cards
- Hamburger menu hidden
- Modals float in center
- Hover states work

### 5. Specific Features to Test

#### Home Page (`/`)
- [ ] Hero section scales properly
- [ ] CTA buttons are tappable
- [ ] Feature cards stack on mobile
- [ ] Animations work smoothly
- [ ] Hamburger menu appears on mobile

#### Dashboard (`/dashboard`)
- [ ] Project grid responds to screen size
- [ ] "New Project" button is accessible
- [ ] Create modal slides from bottom on mobile
- [ ] Delete confirmation modal works
- [ ] Project cards are tappable
- [ ] Status badges are visible

#### Project Detail (`/projects/[id]`)
- [ ] Upload section is usable
- [ ] File input is tappable
- [ ] Status section displays properly
- [ ] Back button works
- [ ] Language badges wrap properly

### 6. Common Issues to Check

❌ **Horizontal Scrolling**
- Scroll horizontally on each page
- Should never scroll left/right

❌ **Text Too Small**
- Try reading without zooming
- All text should be legible

❌ **Buttons Too Small**
- Try tapping all buttons
- Should be easy to hit

❌ **Input Zoom on iOS**
- Focus on input fields
- Should not auto-zoom

❌ **Modal Issues**
- Open modals on mobile
- Should slide from bottom, not center

❌ **Navigation Issues**
- Open hamburger menu
- Should slide smoothly

### 7. Browser Testing Matrix

| Browser | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Safari iOS | ✅ | ✅ | N/A |
| Chrome Android | ✅ | ✅ | N/A |
| Chrome Desktop | N/A | ✅ | ✅ |
| Firefox Desktop | N/A | ✅ | ✅ |
| Safari Desktop | N/A | ✅ | ✅ |
| Edge | N/A | ✅ | ✅ |

### 8. Performance Testing

#### Lighthouse (Chrome DevTools)
1. Open DevTools
2. Go to "Lighthouse" tab
3. Select "Mobile" device
4. Click "Generate report"
5. Check scores:
   - Performance: > 90
   - Accessibility: > 90
   - Best Practices: > 90

#### Network Throttling
1. Open DevTools Network tab
2. Select "Slow 3G" or "Fast 3G"
3. Test page load times
4. Ensure app is still usable

### 9. Accessibility Testing

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Can close modals with Escape
- [ ] Can navigate menu with keyboard

#### Screen Reader
- [ ] Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] All buttons have labels
- [ ] Images have alt text
- [ ] Form inputs have labels

### 10. Quick Fixes

#### If horizontal scrolling occurs:
```css
/* Add to problematic element */
max-width: 100vw;
overflow-x: hidden;
```

#### If text is too small:
```css
/* Increase font size */
font-size: 16px; /* or 1rem */
```

#### If buttons are too small:
```css
/* Increase touch target */
min-height: 44px;
min-width: 44px;
padding: 12px 24px;
```

#### If iOS zooms on input:
```css
/* Set minimum font size */
input {
  font-size: 16px;
}
```

## 📱 Recommended Test Devices

### Physical Devices
1. iPhone SE (smallest modern iPhone)
2. iPhone 14 Pro (standard size)
3. iPad (tablet testing)
4. Android phone (Samsung/Pixel)

### Browser DevTools Presets
1. iPhone SE (375px width)
2. iPhone 12 Pro (390px width)
3. iPhone 14 Pro Max (430px width)
4. iPad (768px width)
5. iPad Pro (1024px width)

## 🎯 Success Criteria

Your mobile-first implementation is successful when:

✅ Zero horizontal scrolling on any screen size
✅ All text is readable without zooming
✅ All buttons are easily tappable (44x44px minimum)
✅ Modals work properly on mobile (bottom sheets)
✅ Navigation is accessible via hamburger menu
✅ Forms don't trigger iOS auto-zoom
✅ Animations are smooth (60fps)
✅ Lighthouse mobile score > 90
✅ WCAG 2.1 AA compliant
✅ Works on Safari iOS and Chrome Android

## 🚀 Next Steps

After testing, you can:
1. Deploy to production
2. Monitor real user metrics
3. Gather user feedback
4. Iterate on improvements
5. Add progressive web app features
6. Implement offline support
7. Add push notifications
8. Optimize for specific devices
