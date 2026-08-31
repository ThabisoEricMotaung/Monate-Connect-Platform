# Thuso Phase 4: Integration & Data Connections
## Command & AI Workspace — Live Data Integration

---

## Overview

Phase 4 connects the Thuso Workspace components to real data sources and APIs, enabling:
- Live RFQ data from Supabase
- Real-time SmartScore calculations
- Document upload and storage
- AI-powered chat with context awareness
- Workflow state management

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│         Thuso Workspace Components                  │
│  (Supplier & Buyer Workflows)                       │
└────────────────┬────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌──────────┐ ┌────────┐ ┌─────────────┐
│useThsuo  │ │File    │ │Chat         │
│Data Hook │ │Upload  │ │Integration  │
└────┬─────┘ └───┬────┘ └─────┬───────┘
     │           │            │
     ▼           ▼            ▼
  Supabase   Storage    AI Backend
  (RFQ)      (Docs)     (Claude)
  (Scores)   
  (Responses)
```

---

## Integration Layers

### 1. Data Hook: `useThsuoData.ts`

**Purpose:** Real-time data fetching from Supabase

**Exports:**
- `useThsuoData(rfqId?)` — Generic hook for RFQ, response, and score data
- `useSupplierWorkspace(rfqId?)` — Supplier-specific data layer
- `useBuyerWorkspace(rfqId?)` — Buyer-specific data layer

**Data Fetched:**
```typescript
interface ThsuoDataState {
  rfqs: RFQData[]              // All RFQs
  responses: SupplierResponse[] // Supplier responses
  smartScores: Record<...>      // SmartScore data
  loading: boolean
  error: string | null
}
```

**Usage in Components:**
```typescript
// In Supplier component
const { activeRfq, smartScore } = useSupplierWorkspace(rfqId)

// In Buyer component
const { rfqs, supplierResponses, smartScores } = useBuyerWorkspace(rfqId)
```

---

### 2. File Upload: `fileUpload.ts`

**Purpose:** Handle document uploads to Supabase Storage

**Exports:**
- `uploadSupplierDocument(file, rfqId, userId, documentType)` — Upload with validation
- `deleteSupplierDocument(filePath)` — Delete uploaded file
- `getSupplierDocuments(rfqId, userId)` — List all documents for RFQ

**Upload Validation:**
- Max size: 10MB
- Allowed types: PDF, Word, Excel, JPEG, PNG
- Automatic organization: `{rfqId}/{userId}/{documentType}/{timestamp}-{fileName}`

**Usage in InputBar:**
```typescript
const handleFileSelect = async (file: File) => {
  const result = await uploadSupplierDocument(
    file,
    rfqId,
    userId,
    "beecert"
  )
  if (result.success) {
    // File uploaded successfully
    // result.url contains public URL
  }
}
```

---

### 3. Chat Integration: `chatIntegration.ts`

**Purpose:** AI-powered chat with context awareness

**Exports:**
- `generateSystemPrompt(contextData)` — Create role-aware AI prompt
- `getContextualPrompts(contextData)` — Suggest contextual quick prompts
- `parseUserIntent(message)` — Detect user's intent
- `generateAIResponse(message, contextData, history)` — Generate AI response
- `saveChatMessage(message, rfqId, userId)` — Persist chat history

**Intent Detection:**
- `DOCUMENT_UPLOAD` — User wants to upload docs
- `SCORE_INQUIRY` — Questions about SmartScore
- `SUBMISSION` — Ready to submit/finalize
- `REQUIREMENTS` — Questions about what's needed
- `APPROVAL_WORKFLOW` — Buyer routing/approval questions
- `GENERAL` — Fallback

**Context-Aware Behavior:**
```typescript
// Supplier prompt suggestions
if (missingDocuments.length > 0) {
  suggest: "I need to upload [Document]. How do I do that?"
}

// Buyer prompts
if (supplierScores.length > 0) {
  suggest: "Compare [Supplier A] vs [Supplier B]"
}
```

**Usage in ChatInterface:**
```typescript
const systemPrompt = generateSystemPrompt({
  rfqId,
  userRole: "supplier",
  completionStatus: 85,
  missingDocuments: ["Tax Clearance"]
})

const response = await generateAIResponse(
  userMessage,
  contextData,
  conversationHistory
)
```

---

## Data Flow Example: Supplier Workflow

### 1. Page Load
```
ThsuoWorkspace mounts
  ↓
useSupplierWorkspace(rfqId) hooks into Supabase
  ↓
Fetches RFQ #451, SmartScore data
  ↓
ProjectStatusCard renders with live data:
  - Completion: 85%
  - Missing: BEE Certificate
  - Deadline: 25 Aug 2026
```

### 2. User Uploads Document
```
User clicks attachment icon
  ↓
FileInput dialog opens
  ↓
User selects BEE_Certificate.pdf
  ↓
uploadSupplierDocument() called
  ↓
File validated (size, type)
  ↓
Uploaded to Supabase Storage:
  - Path: 451/user123/beecert/1234567890-BEE_Certificate.pdf
  ↓
Returns public URL
  ↓
Message sent: "📎 Uploading: BEE_Certificate.pdf"
  ↓
Chat integration saves message to database
```

### 3. User Asks Question
```
User: "How is my SmartScore calculated?"
  ↓
parseUserIntent() → SCORE_INQUIRY
  ↓
generateSystemPrompt() → supplier-aware prompt
  ↓
generateAIResponse() → contextual answer about SmartScore
  ↓
Chat message displayed to user
```

---

## API Integration Points

### Supabase Tables
```sql
-- RFQ data (read-only in Thuso)
SELECT * FROM rfqs WHERE id = $1

-- Supplier responses
SELECT * FROM quotes WHERE rfq_id = $1

-- SmartScores (from profiles)
SELECT id, bbbee_level, verification_status 
FROM profiles WHERE role = 'supplier'

-- Document storage (Supabase Storage bucket)
/supplier-documents/{rfqId}/{userId}/{documentType}/{file}
```

### Chat Backend (Ready for Connection)
```typescript
// Hook into your AI backend (Claude, OpenAI, etc.)
const response = await fetch('/api/thuso/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: userMessage,
    systemPrompt: generateSystemPrompt(contextData),
    conversationHistory,
    context: contextData
  })
})
```

---

## Connection Checklist

- [x] Data hooks created (`useThsuoData`, `useSupplierWorkspace`, `useBuyerWorkspace`)
- [x] File upload utilities ready (`uploadSupplierDocument`, etc.)
- [x] Chat integration scaffolding complete
- [ ] **TODO:** Wire up `useThsuoData` to actual Supabase queries (if not already doing so)
- [ ] **TODO:** Connect `uploadSupplierDocument` to InputBar file upload
- [ ] **TODO:** Connect `generateAIResponse` to your AI backend (Claude API)
- [ ] **TODO:** Persist chat history with `saveChatMessage`
- [ ] **TODO:** Add real-time subscription to RFQ status changes (Supabase realtime)

---

## Next Phase: Phase 5 — Polish & Animations

Once integration is wired up:
1. Add loading states while data fetches
2. Add error boundaries and retry logic
3. Add smooth transitions between states
4. Test full end-to-end workflows
5. Optimize performance with caching/memoization

---

## Files Created in Phase 4

```
src/
├── hooks/
│   └── useThsuoData.ts          # Data hooks
├── lib/thuso/
│   ├── fileUpload.ts            # File upload utilities
│   └── chatIntegration.ts        # Chat & AI integration
└── components/thuso/
    └── index.ts                 # (from Phase 2-3)

THUSO_PHASE4_INTEGRATION.md       # This file
```

---

## Ready to Deploy

All components are built and integration points are clear. Next steps:

1. **Wire up data sources** — Connect useThsuoData to your actual API
2. **Test supplier workflow** — Upload doc → See SmartScore update
3. **Test buyer workflow** — View scores → Route for approval
4. **Enable AI chat** — Connect to Claude/your AI backend
5. **Monitor & iterate** — User feedback loop

**Status:** Ready for Phase 5 (Polish & Animations) or immediate integration testing.
