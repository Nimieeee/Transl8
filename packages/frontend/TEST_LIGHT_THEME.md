# Testing the Light Theme

## Quick Test Steps

### 1. Start the Development Server
```bash
cd packages/frontend
npm run dev
```

### 2. Open the Application
Navigate to `http://localhost:3000`

### 3. Toggle the Theme

#### On Desktop
- Look for the Sun/Moon icon in the top-right corner
- Click to switch between light and dark themes

#### On Mobile
- Tap the hamburger menu (top-left)
- Find the Sun/Moon icon next to "TRANSL8" heading
- Tap to switch themes

### 4. Verify Theme Persistence
1. Switch to light theme
2. Refresh the page
3. Theme should remain light (no flash)

### 5. Test All Pages

#### Home Page (`/`)
- [ ] Background grid visible but subtle
- [ ] Gradient orbs subtle (not overwhelming)
- [ ] "TRANSL8" heading readable
- [ ] Primary button (Launch Studio) has good contrast
- [ ] Feature cards have clear borders
- [ ] Text is crisp and readable

#### Dashboard (`/dashboard`)
- [ ] Header background clear
- [ ] "New Project" button stands out
- [ ] Project cards have borders and shadows
- [ ] Status badges readable (green, blue, red)
- [ ] Delete button hover state works
- [ ] Empty state message readable

#### Project Detail (`/projects/[id]`)
- [ ] All sections clearly defined
- [ ] Upload zone has dashed border
- [ ] Form inputs have clear borders
- [ ] Status indicators readable
- [ ] Action buttons have good contrast

### 6. Test Modals

#### Create Project Modal
- [ ] Backdrop is dark (even in light mode)
- [ ] Modal has clear border
- [ ] Input fields have borders
- [ ] Dropdown menus readable
- [ ] Buttons have good contrast

#### Delete Confirmation Modal
- [ ] Red accent visible
- [ ] Warning icon clear
- [ ] Text readable
- [ ] Buttons distinguishable

### 7. Accessibility Checks

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Theme toggle accessible via keyboard
- [ ] Modal can be closed with Escape

#### Screen Reader
- [ ] Theme toggle has proper aria-label
- [ ] All buttons have descriptive labels
- [ ] Status badges announce correctly

#### Contrast
Use browser DevTools or online tools:
- [ ] All text meets WCAG AA minimum
- [ ] Headings meet AAA (16.1:1)
- [ ] Body text meets AAA (7.5:1)
- [ ] Status badges meet AA (7.0:1+)

### 8. Mobile Testing

#### Responsive Behavior
- [ ] Theme toggle in mobile menu works
- [ ] All text readable on small screens
- [ ] Touch targets adequate (44px minimum)
- [ ] No horizontal scroll
- [ ] Modals slide up smoothly

#### Device Testing
- [ ] iOS Safari
- [ ] Chrome Mobile (Android)
- [ ] Different screen sizes (375px, 768px, 1024px)

### 9. Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers

### 10. Performance

#### Theme Switching
- [ ] Smooth transition (no jank)
- [ ] No layout shift
- [ ] No flash of wrong theme
- [ ] LocalStorage saves immediately

#### Page Load
- [ ] Theme loads before content (no flash)
- [ ] No visible transition on first load
- [ ] Correct theme applied immediately

## Common Issues & Solutions

### Issue: Flash of wrong theme on load
**Solution**: Theme initialization script in `layout.tsx` should run before render

### Issue: Theme doesn't persist
**Solution**: Check browser localStorage is enabled

### Issue: Grid too visible in light mode
**Solution**: Adjust `--grid-opacity` in CSS variables (currently 0.4)

### Issue: Text hard to read
**Solution**: Verify you're using CSS variables, not hardcoded colors

### Issue: Buttons lack contrast
**Solution**: Check you're using the adjusted accent colors for light mode

## Visual Checklist

### Light Theme Should Look Like:
- ✅ Clean, minimal, "studio" aesthetic
- ✅ Engineering graph paper grid (very subtle)
- ✅ Clear borders on all surfaces
- ✅ Soft shadows (not glows)
- ✅ Crisp, readable text
- ✅ Brand colors present but refined
- ✅ Professional, clinical feel

### Light Theme Should NOT Look Like:
- ❌ Washed out or low contrast
- ❌ Cluttered or busy
- ❌ Pure white backgrounds everywhere
- ❌ Pure black text
- ❌ Neon/vibrating colors
- ❌ Heavy shadows or glows

## Automated Testing (Optional)

### Contrast Ratio Testing
```bash
# Install axe-core
npm install -D @axe-core/cli

# Run accessibility audit
npx axe http://localhost:3000
```

### Visual Regression Testing
```bash
# Install Percy or similar
npm install -D @percy/cli

# Take snapshots in both themes
npx percy snapshot http://localhost:3000
```

## Reporting Issues

If you find any issues:
1. Note the page/component
2. Specify light or dark theme
3. Include browser/device info
4. Screenshot if possible
5. Describe expected vs actual behavior

## Success Criteria

The light theme is ready when:
- ✅ All pages render correctly
- ✅ Theme toggle works smoothly
- ✅ Theme persists across sessions
- ✅ WCAG AA compliance verified
- ✅ No visual bugs or glitches
- ✅ Mobile experience is smooth
- ✅ All browsers supported

## Next Steps After Testing

1. Gather user feedback
2. Make adjustments based on feedback
3. Consider adding system preference detection
4. Document any edge cases found
5. Update this guide with new findings
