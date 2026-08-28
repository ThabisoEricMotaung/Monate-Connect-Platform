# AiForm Procure — Component Library

## Overview
This document tracks all UI components, their standardization status, and alignment with the Master Mark System.

---

## Core Components (Foundational)

### Buttons
**Status:** ⚠️ Partial — Various button styles scattered across codebase
**Location:** Used in multiple components, no centralized definition
**Standard Reference:** Brand System §4 (Component Library Standards)

#### Current Issues
- [ ] No centralized button component
- [ ] Inconsistent hover/active states
- [ ] Mixed sizing conventions (padding varies)
- [ ] No disabled state patterns
- [ ] Focus indicators not standardized

**Standardization Tasks:**
1. Create `Button.tsx` component with variants (Primary, Secondary, Ghost)
2. Define sizes (Large, Regular, Small)
3. Implement proper focus/hover/active/disabled states
4. Add accessibility (min 44x44px, proper aria-labels)

---

### Cards
**Status:** ⚠️ Partial — Multiple card patterns
**Locations:** 
- OpportunityStatsBanner (stats cards)
- TenderCard (tender listing)
- InfoCards (home page)

**Standard Reference:** Brand System §4 (Component Library Standards)

#### Variants Identified
- Stat cards (with count + label)
- Tender cards (title + metadata)
- Info cards (icon + title + description)
- Section cards (panel containers)

**Standardization Tasks:**
1. Create `Card.tsx` base component
2. Variant: `StatCard.tsx` (icon + count + label)
3. Variant: `TenderCard.tsx` (title + buyer + budget + closing)
4. Ensure consistent padding (20-24px), radius (14-22px), shadow
5. Support light/dark mode theming

---

### Forms
**Status:** ⚠️ Partial — Individual field components
**Locations:**
- Various dashboard pages
- Auth pages
- Modal components

**Standardization Tasks:**
1. Create `FormField.tsx` wrapper
2. Standardize `TextInput.tsx` (44px height, focus ring)
3. Create `SelectField.tsx` with accessible dropdown
4. Create `TextAreaField.tsx` (minimum 100px height)
5. Standardize error states (warning color #8A6A32)
6. Add helper text and character count patterns

---

## Layout Components

### Navigation
| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Navbar | ✅ Complete | PublicHeader.tsx | Primary nav, responsive |
| AppChrome | ✅ Complete | layout/AppChrome.tsx | Page wrapper |
| Breadcrumbs | ⚠️ Partial | Multiple locations | Inconsistent styling |
| SideNav | ❌ Missing | N/A | Needed for dashboards |

**Tasks:**
- [ ] Standardize breadcrumb styling (consistent font, spacing)
- [ ] Create SideNav component for admin/buyer dashboards
- [ ] Ensure nav link focus states are visible

---

### Footer
| Component | Status | Location |
|-----------|--------|----------|
| PublicFooter | ✅ Complete | PublicFooter.tsx |
| Brand Footer | ✅ Complete | Includes logo, links, social |

**Status:** Good — maintains brand standards

---

## Feature Components

### Home Page
| Component | Status | Notes |
|-----------|--------|-------|
| HeroSection | ✅ | Primary messaging |
| OpportunityStatsBanner | ⚠️ | Card styling inconsistent |
| InfoCards | ⚠️ | Grid layout, needs standardization |
| CTASection | ✅ | Call-to-action section |
| TrustStrip | ✅ | Trust badges |
| LiveOpportunitiesSection | ✅ | Tender carousel |

### Tender Pages
| Component | Status | Notes |
|-----------|--------|-------|
| TenderCard | ⚠️ | Needs button standardization |
| Breadcrumbs | ⚠️ | Styling needs consistency |
| TendersPageContent | ✅ | Layout structure good |

### Dashboard Components
| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Trend Chart | ⚠️ | dashboard/TrendChart.tsx | Lazy loading OK, styling |
| ChartSkeleton | ✅ | dashboard/ChartSkeleton.tsx | Loading state |
| LazyBarChart | ✅ | charts/LazyBarChart.tsx | Performance OK |
| LazyAreaChart | ✅ | charts/LazyAreaChart.tsx | Performance OK |

### Compliance
| Component | Status | Location |
|-----------|--------|----------|
| ComplianceChecklist | ⚠️ | compliance/ComplianceChecklist.tsx |
| ComplianceBanner | ⚠️ | compliance/ComplianceBanner.tsx |
| OpportunityComplianceChecklist | ⚠️ | OpportunityComplianceChecklist.tsx |

**Issues:**
- [ ] Checkbox styling not standardized
- [ ] Banner colors inconsistent
- [ ] Needs dark mode support

### Support & Feedback
| Component | Status | Location |
|-----------|--------|----------|
| HaveYourSayPanel | ✅ | HaveYourSayPanel.tsx | Good styling |
| UnifiedSupportCenter | ✅ | UnifiedSupportCenter.tsx | Main support interface |

---

## Utility Components

### Theme & Appearance
| Component | Status | Location |
|-----------|--------|----------|
| ThemeProvider | ✅ | theme/ThemeProvider.tsx |
| ThemeToggle | ✅ | theme/ThemeToggle.tsx |
| AppearanceCore | ✅ | theme/AppearanceCore.tsx |

**Status:** Good — theme switching works

### Notifications & Alerts
| Component | Status | Notes |
|-----------|--------|-------|
| NotificationBell | ⚠️ | Styling, animation |
| NewsTicker | ✅ | Good styling |
| IncompleteRegistrationBanner | ✅ | Clear messaging |
| AccountDeletedNotice | ✅ | Good styling |
| PhoneVerificationBanner | ✅ | Clear CTA |

### Media & Display
| Component | Status | Location |
|-----------|--------|----------|
| ProfileImage | ✅ | ProfileImage.tsx |
| BrandMark | ⚠️ | BrandMark.tsx | Logo usage |
| SignedDocumentLink | ✅ | SignedDocumentLink.tsx |

---

## Standardization Priority Matrix

### High Priority (Week 1)
```
Button Component
├─ Primary variant
├─ Secondary variant
├─ Ghost variant
├─ All sizes (L, M, S)
└─ All states (default, hover, active, disabled, focus)

Card Component
├─ Base card
├─ StatCard variant
├─ TenderCard standardization
└─ Dark mode support
```

### Medium Priority (Week 2)
```
Form Components
├─ TextInput standardization
├─ SelectField component
├─ TextArea standardization
├─ Error state patterns
└─ Accessibility improvements

Navigation
├─ Breadcrumb standardization
├─ SideNav creation
└─ Focus indicators
```

### Low Priority (Week 3+)
```
Compliance Components
├─ Checkbox standardization
├─ Banner color alignment
└─ Dark mode support

Utility Components
├─ Animation system refinement
└─ Micro-interaction standards
```

---

## Implementation Roadmap

### Phase 2A: Core Components (This Sprint)
- [ ] Create `src/components/ui/Button.tsx` (Primary, Secondary, Ghost, sizes, states)
- [ ] Create `src/components/ui/Card.tsx` (Base card component)
- [ ] Create `src/components/ui/StatCard.tsx` (Stat card variant)
- [ ] Standardize TenderCard usage
- [ ] Add Storybook stories for each component

### Phase 2B: Form Components
- [ ] Create `src/components/ui/FormField.tsx` (Wrapper)
- [ ] Create `src/components/ui/TextInput.tsx`
- [ ] Create `src/components/ui/SelectField.tsx`
- [ ] Create `src/components/ui/TextArea.tsx`
- [ ] Standardize error/success states

### Phase 2C: Navigation & Layout
- [ ] Standardize breadcrumb component
- [ ] Create `src/components/ui/SideNav.tsx`
- [ ] Ensure focus indicators across all components
- [ ] Create mobile navigation variant

### Phase 2D: Documentation & Testing
- [ ] Create Storybook setup
- [ ] Write component stories for all UI components
- [ ] Add accessibility tests (axe)
- [ ] Create component migration guide for developers

---

## Standardization Checklist Template

For each component being standardized:

```
Component: [Name]
Location: [File path]
Status: [ ] Not Started [ ] In Progress [ ] Review [ ] Complete

Brand Alignment:
- [ ] Follows color palette (CSS variables)
- [ ] Typography matches scale
- [ ] Spacing uses defined scale
- [ ] Border radius consistent (14-22px)
- [ ] Shadows use CSS variables

Accessibility:
- [ ] Focus indicators visible
- [ ] Touch targets ≥44x44px
- [ ] Color contrast ≥4.5:1
- [ ] Semantic HTML
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works

States:
- [ ] Default state
- [ ] Hover state
- [ ] Active/Focus state
- [ ] Disabled state
- [ ] Loading state (if applicable)
- [ ] Error state (if applicable)

Dark Mode:
- [ ] Colors adapt via CSS variables
- [ ] Contrast maintained
- [ ] No hard-coded colors

Documentation:
- [ ] Component file has JSDoc
- [ ] Usage examples provided
- [ ] Props interface documented
- [ ] Accessibility notes included
- [ ] Storybook story created
```

---

## Migration Guide

### For Developers

**Old Pattern (Avoid):**
```tsx
<button className="px-4 py-2 bg-[#315A78] text-white rounded-lg hover:bg-[#1E3B56]">
  Submit
</button>
```

**New Pattern (Use):**
```tsx
import Button from '@/components/ui/Button'

<Button variant="primary" size="regular">
  Submit
</Button>
```

**Benefits:**
- Consistent theming (dark mode automatic)
- Standardized accessibility
- Single source of truth
- Easier maintenance
- Better TypeScript support

---

## Resources

### Files to Update
- Component files (50+ files identified)
- Storybook setup (TBD)
- Component migration scripts

### Documentation Links
- Brand System: `/BRAND_SYSTEM.md`
- Tailwind Config: `tailwind.config.ts`
- CSS Variables: `src/app/globals.css`

---

**Last Updated:** August 28, 2026
**Phase:** 2 (Standardization)
**Next Milestone:** Component library complete with Storybook
**Owner:** Design System Team
