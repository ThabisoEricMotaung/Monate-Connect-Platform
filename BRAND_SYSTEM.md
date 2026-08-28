# AiForm Procure — Master Mark System

## 1. Logo & Mark System

### Primary Mark
- **Full Logo:** AiForm Procure wordmark + icon
- **Icon Only:** Geometric mark (currently: /aiform-mark.png)
- **Lockup:** Logo + supporting tagline for key pages
- **Minimum Size:** 24px height (digital), 8mm (print)
- **Clear Space:** 1x mark width on all sides

### Logo Variations
- **Horizontal:** Logo left, text right (primary usage)
- **Stacked:** Icon above text (narrow layouts, mobile)
- **Icon Only:** Mark alone (favicons, app icons, small spaces)
- **Monochrome:** Single color (dark backgrounds, limited color)
- **Reversed:** White on dark (footer, dark sections)

### Usage Guidelines
- ✅ DO: Use on light/dark backgrounds with proper contrast
- ✅ DO: Maintain clear space and proportions
- ❌ DON'T: Rotate, skew, or distort the mark
- ❌ DON'T: Use drop shadows or effects
- ❌ DON'T: Change colors or opacity

---

## 2. Color System

### Primary Palette
| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Accent (Blue) | #315A78 | 49, 90, 120 | Primary CTA, links, highlights |
| Accent Soft | #8497A6 | 132, 151, 166 | Hover states, secondary accents |
| Accent Strong | #1E3B56 | 30, 59, 86 | Dark states, emphasis |
| Success (Green) | #2F8C67 | 47, 140, 103 | Confirmations, positive states |
| Warning (Gold) | #8A6A32 | 138, 106, 50 | Alerts, caution, inactive states |

### Neutral Palette (Light Mode)
| Element | Color | Usage |
|---------|-------|-------|
| Primary Text | #24282D | Body copy, main text |
| Secondary Text | #48525D | Subtext, descriptions |
| Muted Text | #5B6470 | Disabled, helper text |
| Backgrounds | #F7F6F1 (page), #FFFEFA (surface) | Page and container backgrounds |
| Borders | #BCB6AD (normal), #7D858B (strong) | Dividers, outlines |

### Dark Mode Equivalents
- Apply theme class `.theme-dark` to `<html>` element
- All CSS variables automatically adjust
- Maintain contrast ratio ≥ 4.5:1 for accessibility

---

## 3. Typography

### Font Stack
```css
--font-ui: 'Libre Franklin' (400, 500, 600, 700)
--font-display: 'Source Serif 4' (400, 600, 700)
```

### Type Scales

#### Display (Editorial)
- **H1:** 48px (2xl), 700 weight, line-height 1.1
- **H2:** 36px (xl), 600 weight, line-height 1.2
- **H3:** 28px (lg), 600 weight, line-height 1.3

#### Body (UI)
- **Body Large:** 16px (base), 400 weight, line-height 1.6
- **Body Regular:** 14px (sm), 400 weight, line-height 1.5
- **Label:** 12px (xs), 600 weight, line-height 1.4
- **Caption:** 11px, 400 weight, line-height 1.3

#### Usage
- Headlines: Display font (serif) for authority
- Body: UI font (sans) for readability
- Never mix serif and sans in same element

---

## 4. Component Library Standards

### Buttons
- **Variants:** Primary (filled), Secondary (outline), Ghost (text-only)
- **Sizes:** Large (py-3), Regular (py-2), Small (py-1)
- **States:** Default, hover, active, disabled
- **Accessible:** min-height 44px, min-width 44px (touch targets)

### Cards
- **Border Radius:** 14-22px (rounded, not sharp)
- **Shadow:** Use CSS variables (--card-shadow, --card-lift-shadow)
- **Padding:** 20-24px inside cards
- **Hierarchy:** Use accent color for importance

### Forms
- **Input Height:** 44px minimum (touch-friendly)
- **Focus State:** 2px ring with accent color (--accent-soft-rgb)
- **Labels:** Above input, bold, clear label text
- **Error State:** Warning color (#8A6A32) for validation messages

### Spacing Scale
```
xs:  2px   (1px outline, minimal)
sm:  4px   (buttons, small gaps)
md:  8px   (component padding)
lg:  12px  (section spacing)
xl:  16px  (major spacing)
2xl: 24px  (large section gaps)
3xl: 32px  (hero sections)
```

---

## 5. Icon System

### Design Principles
- **Consistent Stroke:** 1.5-2px strokes, 24px base size
- **Alignment:** Center optically in square containers
- **Spacing:** Minimum 2px from edge
- **Simplicity:** 1-2 shapes per icon (avoid complexity)

### Icon Set Status
- **In Use:** Tabler Icons (via @tabler/icons-react)
- **Custom Icons:** Create as SVG components for consistency

### Usage
```tsx
<Icon className="h-4 w-4" stroke={2} aria-hidden />
```

---

## 6. Motion & Animation

### Principles
- **Duration:** 200-300ms for UI interactions
- **Easing:** ease-in-out for natural feel
- **Restraint:** Animate only necessary elements
- **Accessibility:** Respect prefers-reduced-motion

### Common Animations
- **Fade:** 200ms opacity transition
- **Slide:** 250ms transform + opacity
- **Scale:** 200ms scale on hover/focus
- **Highlight:** 300ms color transition

---

## 7. Accessibility Standards

### Color Contrast
- **AA:** 4.5:1 for normal text, 3:1 for large text (18px+)
- **AAA:** 7:1 for normal text, 4.5:1 for large text (optimal)
- **Test:** Use WebAIM or axe DevTools

### Interactive Elements
- **Focus Indicators:** Always visible (no `outline: none`)
- **Touch Targets:** Minimum 44x44px
- **Keyboard Navigation:** Tab order follows visual order
- **Semantic HTML:** Use proper heading hierarchy, labels, landmarks

### ARIA & Labels
- **Buttons:** Descriptive text or aria-label
- **Icons:** aria-hidden if decorative
- **Form Fields:** Associated <label> elements
- **Live Regions:** Use aria-live for dynamic updates

---

## 8. Brand Voice & Tone

### Voice Characteristics
- **Professional:** Authoritative, trustworthy
- **Practical:** Direct, solution-focused
- **Human:** Clear language, avoid jargon
- **Optimistic:** Supportive, enabling language

### Tone Examples
- ✅ "Let's find the right suppliers for your needs"
- ❌ "Supplier discovery algorithm initiated"
- ✅ "Your RFQ closed successfully"
- ❌ "Status change: TERMINAL"

### Microcopy Standards
- **Buttons:** Action-oriented ("Post RFQ", not "Submit")
- **Errors:** Helpful guidance ("Email not found. Check spelling or sign up")
- **Success:** Reinforcing ("Your quote has been sent!")
- **Empty States:** Encouraging ("No tenders yet. Check back soon!")

---

## 9. Brand Applications

### Digital Touchpoints
- Website (aiformprocure.co.za)
- Dashboard/Platform
- Mobile app (future)
- Email templates
- Social media profiles

### Marketing Assets
- Blog posts (use display font for headlines)
- Case studies (maintain color palette)
- Presentations (slide master in brand colors)
- Advertisements (icon + headline format)

### Internal Guidelines
- Slack profile (mark icon + "AiForm Procure")
- Email signature (logo + contact info)
- Presentations (branded slide deck template)
- Documents (letterhead template)

---

## 10. Implementation Roadmap

### Phase 1 (Complete)
- ✅ Design token CSS variables
- ✅ Light/dark theme system
- ✅ Typography scale
- ✅ Color palette

### Phase 2 (Current Sprint)
- [ ] Component library standardization
- [ ] Icon system consolidation
- [ ] Brand guidelines documentation
- [ ] Accessibility audit

### Phase 3 (Next)
- [ ] Logo variations (monochrome, stacked, icon-only)
- [ ] Brand asset kit (Figma, templates)
- [ ] Email template redesign
- [ ] Social media graphics

### Phase 4 (Future)
- [ ] Mobile app brand adaptation
- [ ] Print collateral templates
- [ ] Video guidelines
- [ ] Animation system refinement

---

## 11. Resources & Tools

### Design Files
- Figma: [Brand System (private link TBD)]
- Colors: CSS variables in `src/app/globals.css`
- Icons: @tabler/icons-react (24px default)

### Validation
- Color Contrast: https://webaim.org/resources/contrastchecker/
- Accessibility: https://www.axe-core.org/
- Responsive: Chrome DevTools device emulation

### Documentation
- Tailwind Config: `tailwind.config.ts`
- CSS Variables: `:root` in `globals.css`
- Component Library: `src/components/`

---

**Last Updated:** August 28, 2026
**Maintained By:** AiForm Design Team
**Next Review:** Q4 2026
