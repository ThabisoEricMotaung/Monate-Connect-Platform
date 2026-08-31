# Thuso Redesign: Phase 1 Research & Wireframes
## Command & AI Workspace — Full Lifecycle

---

## 1. Current State Analysis

### Current Interface Issues
- Static modal with FAQ cards blocking chat
- Sidebar mixes settings with context
- No quick-action execution (chat-only)
- Generic prompts, not task-aware
- Limited space for active project display
- No real-time data integration

### Current User Flows

**SUPPLIER WORKFLOW (Current)**
1. User opens help centre
2. Sees generic FAQ cards
3. Asks assistant questions via chat
4. Manually navigates to complete tasks
5. Returns to app to execute actions

**BUYER WORKFLOW (Current)**
1. User opens help centre
2. Sees generic FAQ cards
3. Asks about RFQ management
4. Assistant provides info-only responses
5. User manually navigates to perform approvals

---

## 2. High-Impact Quick Actions

### Supplier-Side Actions (Priority Order)
1. **Upload Document** — BEE cert, tax clearance, CIDB, company reg
2. **Check SmartScore** — View current score & gaps
3. **View RFQ Details** — See requirements, timeline, submission status
4. **Submit Response** — Finalize quote/response
5. **Track Compliance** — View missing docs, next steps

### Buyer-Side Actions (Priority Order)
1. **Check Supplier Scores** — SmartScore, verification status
2. **Review Documents** — View uploaded compliance docs
3. **Approve/Route RFP** — Send for final decision
4. **Find Alternate Suppliers** — Search verified suppliers
5. **Update RFQ Status** — Move to next lifecycle stage

---

## 3. Proposed Layout Architecture

### Full-Height Workspace (Not Modal)

```
┌─────────────────────────────────────────────────────┐
│ AiForm Procure | Workspace > Bidvest RFQ #451  👤   │ ← Header (navigation + context)
├─────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐ │
│ │ 🟢 Command Centre Active                         │ │ ← Status banner
│ │ Total RFQs: 125 | SmartScore avg: 8.2 | Alerts: 3 │
│ └──────────────────────────────────────────────────┘ │
├────────────────────┬────────────────────────────────┤
│                    │                                │
│  SIDEBAR           │     MAIN WORKSPACE             │
│  ────────          │     ──────────────             │
│                    │                                │
│ 📂 Recent Chats    │ Hi there! 👋                  │
│ 📌 Active RFQs     │ Welcome to your operational   │
│ 💾 Saved Answers   │ command center.               │
│                    │                                │
│ ────────────       │ ┌─────────────────────────────┐│
│ 🔍 Quick Help      │ │ PROJECT STATUS CARD         ││
│ ⚙️ Settings        │ ├─────────────────────────────┤│
│ 📞 Support         │ │ Project: Draft (🟡)         ││
│                    │ │ Completion: 85% ▓░░░░░░░░  ││
│                    │ │ Suppliers: 3 Scored | 1 Pend││
│                    │ │ Missing: BEE Doc (Supplier D)││
│                    │ └─────────────────────────────┘│
│                    │                                │
│                    │ Quick Actions:                 │
│                    │ [📋 Check Scores] [📄 Docs]  │
│                    │ [✔️ Route RFP]  [🔍 Suppliers]│
│                    │                                │
│                    │ ────────────────────────────── │
│                    │                                │
│                    │ 💬 Chat history scroll area   │
│                    │                                │
├────────────────────┴────────────────────────────────┤
│ 📎 [Drag file] ▮ 2000 ▮ 🎤 [Send] ◀ Input bar    │
└────────────────────────────────────────────────────┘
```

### Key Layout Features
- **Header:** Breadcrumb navigation + active project context
- **Sidebar:** Pure context (Recent, Active, Saved, Quick Help)
- **Main:** Full-height chat with inset data cards
- **Quick Actions:** Horizontal pill buttons above input
- **Input Bar:** File upload + voice + character count + send

---

## 4. Sidebar Restructure

### Supplier Sidebar
```
📂 Recent Chats
  • RFQ #451 Response
  • RFQ #449 Compliance
  • General Questions

📌 Active RFQs
  • Bidvest #451 (85% complete)
  • Eskom #428 (30% complete)
  • CoJ #401 (100% — submitted)

💾 Saved Answers
  • "How to upload docs"
  • "SmartScore explanation"
  • "BEE cert requirements"

────────────

🔍 Quick Help → Opens help drawer
⚙️ Settings → User profile/preferences
📞 Support → Contact form
```

### Buyer Sidebar
```
📂 Recent Chats
  • RFQ #451 Supplier Review
  • RFQ #428 Approvals
  • Scoring Discussion

📌 Active RFQs
  • Bidvest #451 (Awaiting approval)
  • Eskom #428 (Under evaluation)
  • CoJ #401 (Awarded)

💾 Saved Templates
  • "Standard rejection email"
  • "Approval message"
  • "Supplier followup"

────────────

🔍 Quick Help → Opens help drawer
⚙️ Settings → User profile/preferences
📞 Support → Contact form
```

---

## 5. Data Integration Points

### Real-Time Data to Surface

**In Project Status Card:**
- RFQ title + ID
- Current stage (Draft, Open, Under Review, Awarded, Closed)
- Completion % (documents, scores, approvals)
- Supplier count (total, scored, pending, rejected)
- Missing compliance items
- Urgent alerts

**In Chat Context:**
- User's current role (Supplier vs Buyer)
- Active RFQ ID
- Last action timestamp
- Relevant permissions (can upload, can approve, etc.)

**In Quick Actions:**
- Contextual buttons based on role + RFQ stage
- Only show actions user can perform now
- Dynamic button states (enabled/disabled)

---

## 6. Wireframe Concepts

### Supplier View: RFQ Response Flow
```
User: "Can I upload my BEE certificate?"

AI: "Yes, you can upload your BEE document now. 
     Your Bidvest #451 response is 85% complete."

┌─ Project Status ─────────────────┐
│ Bidvest RFQ #451                 │
│ Status: Draft                    │
│ Completion: 85% ▓▓▓░░░░░░░░░░░  │
│                                  │
│ Missing:                         │
│ □ BEE Certificate               │
│ □ Tax Clearance (optional)       │
│                                  │
│ Next: Submit response by 25 Aug  │
└──────────────────────────────────┘

Quick Actions:
[📄 Upload BEE] [📋 View Requirements]
[✔️ Submit Now] [💬 Ask Question]
```

### Buyer View: Supplier Evaluation Flow
```
User: "What's the status of Bidvest's response?"

AI: "Bidvest has submitted their response with a 
     SmartScore of 7.8. Two compliance docs are pending."

┌─ Project Status ─────────────────┐
│ Bidvest RFQ #451                 │
│ Status: Under Review             │
│ Completion: 85% ▓▓▓░░░░░░░░░░░  │
│                                  │
│ Suppliers: 3                     │
│ • Bidvest: 7.8 (Docs pending)   │
│ • Eskom: 8.2 (Complete)         │
│ • CoJ: 6.5 (Missing BEE)         │
│                                  │
│ Action needed: Approve or reject │
└──────────────────────────────────┘

Quick Actions:
[✔️ Check Scores] [📄 Review Docs]
[🚀 Route to Finance] [🔍 Find Alternative]
```

---

## 7. Context-Aware Prompt Delivery

### Supplier Prompts (Dynamic, Task-Based)
- **On load:** "Your RFQ #451 response is 85% complete. Next: upload BEE cert."
- **If docs pending:** "Bidvest needs your BEE certificate. Upload now?"
- **If nearly complete:** "You're close to submitting! Review requirements?"
- **If submitted:** "Response submitted! Check back for feedback."

### Buyer Prompts (Dynamic, Task-Based)
- **On load:** "RFQ #451 has 3 responses. Bidvest (7.8), Eskom (8.2), CoJ (6.5)."
- **If docs missing:** "1 supplier is missing compliance docs. Review?"
- **If ready to approve:** "All docs received. Ready to route for approval?"
- **If decision needed:** "Finance needs your recommendation by tomorrow."

---

## 8. Integration Architecture

### Data Flow
```
RFQ Status → Display in header
           → Update project card
           → Prompt recommendations

Supplier Data → Check SmartScore
              → Show compliance status
              → Enable/disable actions

User Role → Show supplier vs buyer sidebar
          → Display relevant quick actions
          → Filter prompt suggestions

Real-Time Updates → Stream status changes
                  → Update cards dynamically
                  → Refresh action availability
```

### API Endpoints Needed
- `/api/rfq/{id}/status` — Get current RFQ state
- `/api/supplier/{id}/score` — SmartScore data
- `/api/compliance/{id}/documents` — Doc upload status
- `/api/user/context` — Current workflow context
- `/api/actions/available` — Permitted actions for user

---

## 9. Mobile Responsiveness Strategy

### Desktop (Current Layout)
- Full sidebar + full chat + data cards inline
- Quick action pills horizontal

### Tablet (768px)
- Collapsible sidebar (toggle button)
- Chat area expands
- Quick actions stack vertically

### Mobile (375px)
- Sidebar as drawer (hamburger menu)
- Full-screen chat
- Quick actions as carousel (swipeable)
- Data card as expandable section

---

## 10. Success Metrics

- **Engagement:** % of users clicking quick-action buttons
- **Task Completion:** Time to upload doc / approve RFQ
- **Chat Quality:** User satisfaction with context-aware prompts
- **Retention:** Daily/weekly active users in workspace
- **Adoption:** % of users using each quick action

---

## Next Steps (Phase 2)

1. ✅ Finalize layout in Figma/design tool
2. ✅ Create interactive prototype
3. ✅ Test quick-action button placement & labeling
4. ✅ Begin supplier-side implementation (upload flow)
5. ✅ Integrate SmartScore real-time data

**Estimated Phase 1 Completion:** Review + finalization ready for Phase 2 kickoff
