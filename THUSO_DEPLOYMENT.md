# Thuso Workspace Deployment Guide
## Production Deployment Checklist & Instructions

---

## Pre-Deployment: 30 Minutes

### 1. Verify Build ✓
```bash
npm run build
```

**Expected output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
```

**If errors occur:**
- Check TypeScript errors: `npx tsc --noEmit`
- Fix import paths (especially relative imports)
- Verify all components export correctly
- Check ESLint warnings: `npm run lint`

---

### 2. Environment Variables

Create `.env.production`:

```bash
# Supabase (use production project)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key-here
SUPABASE_SERVICE_KEY=prod-service-key-here

# Claude API
ANTHROPIC_API_KEY=sk-ant-prod-key-here

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_FILE_UPLOAD=true
NEXT_PUBLIC_ENABLE_THUSO=true

# Logging (optional)
NEXT_PUBLIC_LOG_LEVEL=error
```

**Add to Vercel:**
1. Go to Vercel dashboard → Project settings
2. Environment Variables section
3. Add each variable from above
4. Apply to Production environment

---

### 3. Database Setup

**Create Supabase tables:**

```sql
-- RFQs table
CREATE TABLE rfqs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'closed', 'awarded'
  budget DECIMAL,
  deadline TIMESTAMP,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_created_by ON rfqs(created_by);
CREATE INDEX idx_rfqs_deadline ON rfqs(deadline);

-- Quotes/Responses table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES auth.users(id),
  supplier_name TEXT,
  amount DECIMAL,
  status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'reviewed', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_quotes_rfq_id ON quotes(rfq_id);
CREATE INDEX idx_quotes_supplier_id ON quotes(supplier_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- Chat history table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  intent TEXT, -- 'DOCUMENT_UPLOAD', 'SCORE_INQUIRY', etc.
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_chat_rfq_id ON chat_messages(rfq_id);
CREATE INDEX idx_chat_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_created_at ON chat_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own RFQs
CREATE POLICY "Users can view their own RFQs" ON rfqs
  FOR SELECT USING (auth.uid() = created_by OR is_public = true);

-- RLS Policy: Suppliers can view their own quotes
CREATE POLICY "Suppliers can view their own quotes" ON quotes
  FOR SELECT USING (auth.uid() = supplier_id);

-- RLS Policy: Chat messages are private
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);
```

**Create Storage bucket:**

```sql
-- Via SQL in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-documents', 'supplier-documents', true);

-- Storage policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'supplier-documents' AND auth.role() = 'authenticated');

-- Storage policy: Allow public read access
CREATE POLICY "Public read access for documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'supplier-documents');
```

---

### 4. Build Verification

```bash
# Clean build
rm -rf .next
npm run build

# Check build size
du -sh .next
# Should be < 500MB

# Lint check
npm run lint

# Type check
npx tsc --noEmit
```

---

## Deployment: 10 Minutes

### Option A: Vercel (Recommended)

**1. Connect repository**
```bash
vercel link
# Follow prompts to connect GitHub repo
```

**2. Set environment variables**
```bash
vercel env add ANTHROPIC_API_KEY
# Paste API key when prompted
# Repeat for other variables
```

**3. Deploy to production**
```bash
vercel deploy --prod
```

**Expected output:**
```
✓ Deployment complete
✓ https://your-project.vercel.app
✓ Production URL active
```

### Option B: Manual Deployment

```bash
# Build
npm run build

# Create deployment package
tar -czf thuso-deployment.tar.gz .next/ package.json

# Upload to your server
scp thuso-deployment.tar.gz user@server:/app/

# On server:
cd /app
tar -xzf thuso-deployment.tar.gz
npm ci --production
NODE_ENV=production npm start
```

---

## Post-Deployment: 20 Minutes

### 1. Smoke Tests

```bash
# Test supplier workspace
curl https://your-domain.com/dashboard/supplier/workspace?rfqId=1

# Test buyer workspace
curl https://your-domain.com/dashboard/buyer/workspace?rfqId=1

# Test chat API
curl -X POST https://your-domain.com/api/thuso/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "context": { "userRole": "supplier" }
  }'

# Test file upload (via browser DevTools)
# Navigate to supplier workspace, try uploading a file
```

### 2. Performance Check

```bash
# Run Lighthouse
npm run build
npx lighthouse https://your-domain.com/dashboard/supplier/workspace?rfqId=1 --view
```

**Target scores:**
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### 3. Error Monitoring

**Set up error tracking:**

```typescript
// In your app layout
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

**Or use Vercel Analytics:**
1. Vercel dashboard → Analytics
2. Monitor error rate
3. Check Web Vitals

### 4. Monitor Logs

**Vercel logs:**
```bash
vercel logs --prod
```

**Supabase logs:**
1. Supabase dashboard → Logs
2. Check for query errors
3. Check for storage errors

---

## Rollback Plan

If issues occur:

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy specific commit
vercel deploy --prod --commit=abc123def456

# Or rollback Supabase (if needed)
# Supabase dashboard → Backups → Restore
```

---

## Production Checklist

### Before Deployment
- [ ] All tests passing
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] Environment variables set in Vercel
- [ ] Supabase tables created
- [ ] Storage bucket configured
- [ ] Claude API key valid
- [ ] Domain/SSL certificate ready
- [ ] Backup of production database

### During Deployment
- [ ] Deploy to Vercel (or manual server)
- [ ] Monitor deployment logs
- [ ] Verify build completes
- [ ] Check Vercel deployment status

### After Deployment
- [ ] Test smoke tests pass
- [ ] Lighthouse score > 80
- [ ] No error spikes
- [ ] User can access pages
- [ ] File upload works
- [ ] Chat API responds
- [ ] Mobile layout works
- [ ] Analytics tracking enabled

---

## Production Configuration

### Security Headers

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Rate Limiting

Add to API routes:

```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
})

export async function POST(request: NextRequest) {
  const ip = request.ip ?? "unknown"
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response("Rate limit exceeded", { status: 429 })
  }

  // Handle request
}
```

### Monitoring & Alerts

**Set up alerts in Vercel:**
1. Settings → Monitoring
2. Add alerts for:
   - Error rate > 1%
   - Response time > 3s
   - Failed deployments

---

## Deployment Commands

```bash
# Local build test
npm run build

# Deploy to staging
vercel deploy

# Deploy to production
vercel deploy --prod

# View deployment logs
vercel logs --tail

# Rollback to previous version
vercel rollback

# Check deployment status
vercel list
```

---

## Troubleshooting Post-Deployment

### Issue: White screen on load
**Solution:**
```bash
# Check browser console for errors
# Vercel → Deployments → View logs
# Look for 500 errors in API routes
```

### Issue: Chat API returns 500
**Solution:**
```bash
# Check ANTHROPIC_API_KEY is set
vercel env ls
# Redeploy if env vars changed
vercel deploy --prod
```

### Issue: File upload fails
**Solution:**
```bash
# Check Supabase Storage bucket
# Verify storage policy allows uploads
# Check file size (max 10MB)
```

### Issue: High error rate
**Solution:**
```bash
# Check Supabase connection
# Verify RLS policies
# Review error logs
vercel logs --tail
```

---

## Success Metrics

After deployment, verify:

- ✅ All pages load without errors
- ✅ File upload works end-to-end
- ✅ Chat API responds with answers
- ✅ Mobile layout responsive
- ✅ Animations smooth (60fps)
- ✅ No console errors
- ✅ Lighthouse score > 80
- ✅ Load time < 2.5s
- ✅ Error rate < 0.1%

---

## Timeline

**Total deployment time: 60 minutes**

- Build verification: 10 min
- Pre-deployment checks: 20 min
- Deployment: 10 min
- Post-deployment testing: 20 min

---

## Next Steps

1. **Monitor** — Watch error rates for 24 hours
2. **Iterate** — Gather user feedback
3. **Optimize** — Address performance issues
4. **Scale** — Plan for next features

---

## Support Contact

If deployment fails:
1. Check logs: `vercel logs --tail`
2. Verify environment variables
3. Check Supabase status
4. Review error messages
5. Contact deployment team with:
   - Error message
   - Deployment timestamp
   - Vercel build log URL
   - Last known working deployment
