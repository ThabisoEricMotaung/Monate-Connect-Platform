# Command & AI Workspace Redesign Spec

## Vision
Transform the cluttered help modal into a **true operational command center** that merges real-time actions with conversational AI, adapting to supplier vs. buyer workflows.

---

## 1. LAYOUT WIREFRAME

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  Command & AI Workspace     [Profile Pic] [X]   │ ← Header
├──────────────┬──────────────────────────────────────────┤
│              │                                           │
│  SIDEBAR     │  ┌─────────────────────────────────────┐ │
│  (Context)   │  │  CHAT STREAM (Full Height)          │ │
│              │  │                                       │ │
│  Recent      │  │  [AI Message Bubble]                │ │
│  Chats       │  │  [User Message Bubble]              │ │
│              │  │  [Context Alert: Missing Docs]      │ │
│  Saved       │  │                                       │ │
│  Answers     │  ├─────────────────────────────────────┤ │
│              │  │ [Prompt Pill] [Prompt Pill] [Dismiss]│ │ ← Floating Pills
│  Active      │  ├─────────────────────────────────────┤ │
│  RFQs/       │  │ [Attach] [Voice] [Add from Docs]    │ │
│  Quotes      │  │ [Quick Actions - Contextual]         │ │
│              │  │ [Draft RFQ] [Check Score] [Upload]  │ │ ← Role-Aware Buttons
│              │  │ [Input Field...]          [Send]    │ │
│              │  └─────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────┘
```

---

## 2. HEADER (Always Visible)

```
┌────────────────────────────────────────────────────────┐
│ [🌲 Logo]  Command & AI Workspace                      │
│                                    [👤 Pic] [Name ▼] [X]│
└────────────────────────────────────────────────────────┘
```

**Components:**
- Logo (brand identity)
- Title + subtitle (e.g., "Your AI procurement co-pilot")
- **User Profile Section (NEW):**
  - 32×32px circular avatar (from profiles.avatar_url)
  - First name (truncated if long)
  - Dropdown menu → Settings, Accessibility, Logout
  - Replaces old "Preferences" sidebar entry

---

## 3. SIDEBAR (Context Only)

**Move to profile dropdown:**
- Preferences
- Accessibility
- Help articles

**Keep in sidebar:**

### For SUPPLIERS:
```
RECENT CHATS
├─ RFQ #402 Compliance Docs    10:42 AM
├─ SmartScore Tips             Yesterday
└─ View all chats

SAVED ANSWERS
├─ B-BBEE Compliance Guide
├─ Preferential Procurement
└─ View all

ACTIVE RFQs
├─ RFQ #402 (In Progress)
├─ RFQ #398 (Submitted)
└─ View all RFQs
```

### For BUYERS:
```
RECENT CHATS
├─ Quote Analysis - RFQ #402    10:42 AM
├─ Vendor Comparison            Yesterday
└─ View all chats

SAVED ANSWERS
├─ RFQ Best Practices
├─ Vendor Evaluation
└─ View all

ACTIVE RFQs
├─ RFQ #402 - Office Furniture
├─ RFQ #398 - IT Hardware
└─ View all RFQs
```

---

## 4. CHAT STREAM (Core)

Full-height, scrollable message area with:
- **AI messages:** Dark card background, rounded, left-aligned
- **User messages:** Light/accent background, right-aligned
- **Context alerts:** Warning banner (yellow bg) with actionable link
  - "Your RFQ #402 response is missing compliance docs. Fix now →"

---

## 5. FLOATING PROMPT PILLS (Smart Replacement)

**Current:** Large stacked FAQ cards blocking chat space  
**Proposed:** Dismissible horizontal chips above input

```
[📋 Draft RFQ Response] [✓ Check SmartScore] [📤 Upload Docs] [✕ Dismiss All]
```

**Behavior:**
- Auto-generate based on context (RFQ, buyer/supplier, missing docs)
- Click → pre-populate input or trigger action
- Dismiss → hide until next context change
- Max 4 pills visible; scroll if overflow

---

## 6. QUICK-ACTION TOOLBAR (Role-Aware)

Directly above input field. Buttons change based on:
- User role (supplier vs buyer)
- Active context (which RFQ is open)
- Document status (missing, incomplete, ready)

### SUPPLIER Quick Actions:
```
[✏️ Draft Response] [📊 Check SmartScore] [📤 Upload BEE Docs] [📋 Review Requirements] [🤖 Ask AI]
```

### BUYER Quick Actions:
```
[➕ Create RFQ] [📊 Analyze Quotes] [👥 Compare Vendors] [📧 Send Message] [🤖 Ask AI]
```

**Implementation:**
- Store action list in `src/lib/commandActions.ts`
- Pass `userRole` + `context` to determine visible actions
- Each button triggers:
  - Form modal, or
  - Direct API call, or
  - Pre-filled chat prompt

---

## 7. INPUT AREA (Bottom Sticky)

```
┌──────────────────────────────────────────────────────────┐
│ [📎 Attach] [🎤 Voice] [📄 Add from Docs]              │
├──────────────────────────────────────────────────────────┤
│ [Quick Action Buttons - Role-Aware]                      │
├──────────────────────────────────────────────────────────┤
│ [Ask anything about RFQs, compliance, documents...]      │
│                                               [Send ➜]  │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Attachments (drag-drop, file picker)
- Voice-to-text toggle
- "Add from Docs" → integrates saved answers
- Accessible input with aria-labels

---

## 8. USER PROFILE INTEGRATION

**Current State:** No user indication when logged in  
**Proposed:**

```
Header: [🌲] Command & AI Workspace        [👤 Thabiso M. ▼] [X]
```

**Profile Dropdown (on click):**
```
┌──────────────────────────┐
│ 👤 Thabiso Motaung      │
│ thabiso@up.ac.za        │
├──────────────────────────┤
│ ⚙️  Preferences          │
│ ♿ Accessibility         │
│ 🔗 Help & Docs          │
├──────────────────────────┤
│ 🚪 Sign Out             │
└──────────────────────────┘
```

**Implementation:**
- Fetch from `profiles.avatar_url` + `auth.user.email`
- Display initials fallback if no avatar
- 32×32px, circular, border in brand accent gold

---

## 9. COMPONENT STRUCTURE

**Files to create/modify:**

```
src/components/UnifiedSupportCenter.tsx
  ├─ CommandHeader.tsx (NEW)
  │   ├─ Logo + Title
  │   └─ ProfileDropdown.tsx (NEW)
  │       ├─ Avatar
  │       ├─ Name
  │       └─ Menu items
  │
  ├─ CommandSidebar.tsx (EXISTING, refactor)
  │   ├─ Recent chats
  │   ├─ Saved answers
  │   └─ Active RFQs (role-aware)
  │
  ├─ ChatStream.tsx (EXISTING, style refresh)
  │   ├─ AI message bubbles
  │   ├─ User message bubbles
  │   └─ Context alerts
  │
  ├─ PromptPills.tsx (NEW)
  │   ├─ Horizontal dismissible pills
  │   └─ Auto-generated from context
  │
  ├─ QuickActionToolbar.tsx (NEW)
  │   ├─ Role-aware buttons
  │   └─ Trigger handlers
  │
  └─ InputArea.tsx (EXISTING, enhance)
      ├─ Attachments
      ├─ Voice input
      └─ Submit handler
```

---

## 10. CONTEXT-AWARE LOGIC

**Supplier Context:**
- Active RFQ #402 → show "Draft Response", "Check SmartScore", "Upload Docs"
- Missing compliance docs → alert banner
- Recent chats prioritize RFQ-related conversations

**Buyer Context:**
- Active RFQ #402 → show "Analyze Quotes", "Compare Vendors", "Send Message"
- Quote analysis available → suggest "Compare Vendors"
- Recent chats prioritize quote/vendor discussions

**Implementation:**
- Store context in React context or URL params
- Pass to components via props
- Query active RFQ/quote on mount

---

## 11. IMPLEMENTATION ROADMAP

### Phase 1: Header & Profile (1-2 hours)
- Create CommandHeader.tsx
- Build ProfileDropdown with avatar
- Move Preferences → dropdown

### Phase 2: Sidebar Refactor (1 hour)
- Remove settings links
- Enhance Recent Chats display
- Add role-aware Active RFQs list

### Phase 3: Prompt Pills (1.5 hours)
- Create PromptPills.tsx
- Implement dismissal logic
- Connect to context

### Phase 4: Quick Actions (2 hours)
- Build QuickActionToolbar.tsx
- Define action mappings (supplier vs buyer)
- Wire up button handlers

### Phase 5: Polish & Integration (1 hour)
- Chat stream styling
- Input area enhancements
- Responsive testing

**Total Est. Time:** 6-7 hours

---

## 12. DESIGN TOKENS

**Colors (Use existing theme):**
- Dark Green: #1a3a2a (sidebar, headers)
- Warm Gold: #c8a060 (accents, buttons)
- Cream: #f8f4ec (backgrounds, input)
- Danger Red: #e74c3c (alerts, missing docs)

**Typography:**
- Header: font-display, 20px, bold
- Chat: 14px, system font
- Labels: 12px, uppercase, tracking-wide

**Spacing:**
- Sidebar width: 240px (or collapse to 56px on mobile)
- Chat padding: 16px
- Button gap: 8px

---

## 13. ACCESSIBILITY REQUIREMENTS

- ♿ Min 44×44px interactive targets (buttons)
- ♿ Keyboard nav through sidebar, pills, actions
- ♿ WCAG AA contrast (text on backgrounds)
- ♿ aria-labels on all buttons
- ♿ Role-aware: `role="main"` for chat area

---

## 14. NEXT STEPS

**Questions before coding:**
1. Should profile avatar pull from `profiles.avatar_url` or `auth.user.avatar`?
2. Do we need a mobile collapse mode for sidebar?
3. Should quick actions show tooltips on hover?
4. Do prompt pills auto-dismiss after 30 seconds or stay until manually dismissed?

