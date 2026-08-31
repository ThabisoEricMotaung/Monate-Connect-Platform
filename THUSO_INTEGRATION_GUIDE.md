# Thuso Workspace Integration Guide
## Connecting Components → Data Sources → API Backends

---

## Quick Start: 5 Minutes

### 1. Import Components
```typescript
// In your page
import { 
  ThsuoWorkspace, 
  ErrorBoundary, 
  ResponsiveLayout, 
  LoadingState 
} from "@/components/thuso"
```

### 2. Use Data Hook
```typescript
const { activeRfq, loading, error } = useSupplierWorkspace(rfqId)
```

### 3. Wrap with Error Handling
```typescript
<ErrorBoundary>
  <LoadingState isLoading={loading} error={error}>
    <ThsuoWorkspace rfq={activeRfq} />
  </LoadingState>
</ErrorBoundary>
```

### 4. Deploy
```bash
npm run build && npm run deploy
```

---

## Integration Layers

### Layer 1: Data Fetching (useThsuoData.ts)

**What it does:**
- Queries Supabase for RFQs, responses, SmartScores
- Provides `loading`, `error`, and data states
- Caches results and handles pagination

**How to integrate:**

```typescript
import { useSupplierWorkspace, useBuyerWorkspace } from "@/hooks/useThsuoData"

// Supplier perspective
const { activeRfq, smartScore } = useSupplierWorkspace(rfqId)

// Buyer perspective
const { activeRfq, supplierResponses, smartScores } = useBuyerWorkspace(rfqId)
```

**Supabase queries needed:**

```sql
-- RFQs table
CREATE TABLE rfqs (
  id SERIAL PRIMARY KEY,
  title TEXT,
  status TEXT, -- 'open', 'closed', 'awarded'
  budget DECIMAL,
  deadline TIMESTAMP,
  is_public BOOLEAN,
  created_at TIMESTAMP
)

-- Quotes/Responses table
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  rfq_id INTEGER,
  supplier_id UUID,
  supplier_name TEXT,
  amount DECIMAL,
  status TEXT, -- 'draft', 'submitted', 'reviewed'
  created_at TIMESTAMP
)

-- Profiles table (for SmartScore)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  role TEXT, -- 'supplier', 'buyer'
  bbbee_level TEXT,
  verification_status TEXT,
  created_at TIMESTAMP
)
```

---

### Layer 2: File Upload (fileUpload.ts)

**What it does:**
- Validates file type (PDF, Word, Excel, images)
- Uploads to Supabase Storage
- Returns public URL
- Handles errors gracefully

**How to integrate:**

```typescript
import { uploadSupplierDocument } from "@/lib/thuso/fileUpload"

const handleFileUpload = async (file: File) => {
  const result = await uploadSupplierDocument(
    file,
    rfqId,           // RFQ ID
    userId,          // Current user ID
    "beecert"        // Document type
  )

  if (result.success) {
    console.log("File uploaded:", result.url)
  } else {
    console.error("Upload failed:", result.error)
  }
}
```

**Supabase Storage setup:**

```bash
# Create bucket via Supabase dashboard:
# Name: supplier-documents
# Public: Yes (if using public URLs)

# Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-documents', 'supplier-documents', true)
```

**File organization:**
```
supplier-documents/
├── {rfqId}/
│   ├── {userId}/
│   │   ├── beecert/
│   │   │   ├── 1693123456789-BEE_Certificate.pdf
│   │   │   └── 1693123457890-BEE_Update.pdf
│   │   ├── taxcert/
│   │   │   └── 1693123458891-Tax_Clearance.pdf
│   │   ├── company_reg/
│   │   │   └── 1693123459892-Company_Reg.pdf
│   │   └── cidb/
│   │       └── 1693123460893-CIDB_Grade.pdf
```

---

### Layer 3: Chat Integration (chatIntegration.ts)

**What it does:**
- Parses user intent from messages
- Generates context-aware AI prompts
- Provides suggested questions
- Ready to connect to Claude API

**How to integrate:**

```typescript
import { generateAIResponse, generateSystemPrompt } from "@/lib/thuso/chatIntegration"

// Generate system prompt based on user role
const systemPrompt = generateSystemPrompt({
  rfqId: 451,
  userRole: "supplier",
  rfqTitle: "Office Supplies RFQ",
  completionStatus: 85,
  missingDocuments: ["BEE Certificate"]
})

// Get AI response
const response = await generateAIResponse(
  userMessage,
  contextData,
  conversationHistory
)
```

**API Route for Claude integration:**

```typescript
// POST /api/thuso/chat
const response = await fetch("/api/thuso/chat", {
  method: "POST",
  body: JSON.stringify({
    message: userMessage,
    systemPrompt,
    conversationHistory,
    context: { rfqId, userRole, rfqTitle }
  })
})

const { message } = await response.json()
```

**Production: Connect to Claude API**

```bash
# 1. Install Anthropic SDK
npm install @anthropic-ai/sdk

# 2. Add environment variable
ANTHROPIC_API_KEY=sk-ant-...

# 3. Update /api/thuso/chat route with actual Claude call
# (See example in route.ts file)
```

---

## Page Integration Examples

### Supplier Workspace Page

**File:** `/src/app/dashboard/supplier/workspace/page.tsx`

**What it does:**
- Loads supplier's RFQ and SmartScore
- Shows project status and missing docs
- Allows document upload
- Provides AI chat assistant

**Key sections:**

1. **Data loading**
```typescript
const { activeRfq, smartScore, loading, error } = useSupplierWorkspace(rfqId)
```

2. **File upload**
```typescript
const result = await uploadSupplierDocument(file, rfqId, userId, documentType)
```

3. **Chat messages**
```typescript
const aiResponse = await generateAIResponse(userMessage, contextData, messages)
```

4. **Error handling**
```typescript
<ErrorBoundary>
  <LoadingState isLoading={loading} error={error}>
    <ThsuoWorkspace />
  </LoadingState>
</ErrorBoundary>
```

---

### Buyer Workspace Page

**File:** `/src/app/dashboard/buyer/workspace/page.tsx`

**What it does:**
- Loads RFQ and all supplier responses
- Shows SmartScores for comparison
- Allows scoring/evaluation
- Provides AI analysis assistant

**Key sections:**

1. **Data loading**
```typescript
const { activeRfq, supplierResponses, smartScores, loading, error } = 
  useBuyerWorkspace(rfqId)
```

2. **Compare suppliers**
```typescript
{supplierResponses.map((response) => (
  <SupplierScoringCard
    supplier={response}
    score={smartScores[response.supplier_id]}
  />
))}
```

3. **AI analysis**
```typescript
const response = await generateAIResponse(
  "Compare Supplier A vs Supplier B",
  { userRole: "buyer", supplierScores: [...] },
  messages
)
```

---

## API Route Setup

### Chat Route: `/api/thuso/chat`

**Endpoint:** `POST /api/thuso/chat`

**Request:**
```json
{
  "message": "What documents do I need to upload?",
  "systemPrompt": "You are an AI assistant for...",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "context": {
    "rfqId": 451,
    "userRole": "supplier",
    "rfqTitle": "Office Supplies RFQ"
  }
}
```

**Response:**
```json
{
  "message": "You need to upload: BEE Certificate, Tax Clearance, Company Registration..."
}
```

**Implementation:**
```typescript
// File: /src/app/api/thuso/chat/route.ts

import Anthropic from "@anthropic-ai/sdk"

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: body.systemPrompt,
    messages: body.conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))
  })

  return Response.json({
    message: response.content[0].type === "text" ? response.content[0].text : ""
  })
}
```

---

## Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Features
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_FILE_UPLOAD=true
```

---

## Testing Checklist

### Unit Tests
- [ ] `uploadSupplierDocument()` validates file type/size
- [ ] `generateAIResponse()` detects user intent
- [ ] `useThsuoData()` handles empty results
- [ ] Error boundaries catch component errors

### Integration Tests
- [ ] Supplier uploads file → appears in chat
- [ ] Buyer loads RFQ → shows all suppliers
- [ ] Chat sends message → gets AI response
- [ ] Mobile layout draws correctly

### E2E Tests
- [ ] Supplier workflow: Load RFQ → Upload Doc → Submit
- [ ] Buyer workflow: Load RFQ → Review Suppliers → Route to Finance
- [ ] Chat workflow: Ask question → Get context-aware answer
- [ ] Error workflow: Simulate error → Show error boundary

### Performance Tests
- [ ] Lighthouse score > 80
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] Animation frame rate 60fps

---

## Deployment Checklist

### Pre-Deployment
- [ ] All TypeScript errors fixed
- [ ] All tests passing
- [ ] Environment variables set
- [ ] Supabase tables created & indexed
- [ ] Storage bucket configured
- [ ] Claude API key valid
- [ ] Mobile responsiveness tested

### Deployment
```bash
# Build and deploy to Vercel
npm run build
vercel deploy --prod
```

### Post-Deployment
- [ ] Test production API routes
- [ ] Monitor error logs
- [ ] Check Core Web Vitals
- [ ] Verify file uploads work
- [ ] Test chat responses

---

## Troubleshooting

### Data not loading
```
Error: "Supabase not configured"

Solution:
1. Check NEXT_PUBLIC_SUPABASE_URL in .env.local
2. Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
3. Verify Supabase project is active
```

### File upload fails
```
Error: "File type not allowed"

Solution:
1. Check file format (PDF, Word, Excel, JPG, PNG only)
2. Check file size (max 10MB)
3. Check Supabase Storage bucket permissions
```

### Chat not responding
```
Error: "Failed to get response"

Solution:
1. Check ANTHROPIC_API_KEY in .env.local
2. Check API rate limits
3. Check network tab in DevTools
4. Check server logs for 500 errors
```

### Mobile layout broken
```
Error: "Sidebar not showing on mobile"

Solution:
1. Check ResponsiveLayout component props
2. Test viewport size (< 768px for mobile)
3. Check CSS import path
4. Verify animations.css is imported
```

---

## Performance Optimization Tips

### 1. Lazy Load Components
```typescript
import dynamic from "next/dynamic"

const ChatInterface = dynamic(
  () => import("@/components/thuso/ChatInterface"),
  { loading: () => <LoadingState isLoading /> }
)
```

### 2. Memoize Components
```typescript
import { memo } from "react"

const ProjectStatusCard = memo(function ProjectStatusCard(props) {
  return <div>{/* content */}</div>
})
```

### 3. Optimize Images
```typescript
import Image from "next/image"

<Image
  src={imageUrl}
  alt="description"
  width={300}
  height={300}
  loading="lazy"
/>
```

### 4. Debounce Search
```typescript
import { useCallback } from "react"

const handleSearch = useCallback(
  debounce((term: string) => {
    // Search logic
  }, 300),
  []
)
```

---

## Next Steps

1. **Complete** integration testing on staging
2. **Deploy** to production
3. **Monitor** Core Web Vitals and error rates
4. **Iterate** based on user feedback
5. **Scale** to additional features (workflows, templates, etc.)

---

## Support & Questions

For integration issues or questions:
1. Check troubleshooting section above
2. Review component props in `/src/components/thuso/`
3. Review hook implementation in `/src/hooks/useThsuoData.ts`
4. Check API route in `/src/app/api/thuso/chat/route.ts`
5. Contact development team with:
   - Component name
   - Error message
   - Steps to reproduce
   - Environment (staging/prod)
