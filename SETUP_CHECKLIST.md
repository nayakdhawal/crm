# Setup Checklist — Lead Capture & Estimate System

Track your progress through the setup steps below. ✅ = complete, 🟡 = in progress, ⭕ = not started

## Phase 1: Project Initialization
- [x] Node.js dependencies configured
- [x] Next.js app setup with Tailwind CSS
- [x] Environment variable template created (`.env.local.example`)
- [x] Company info placeholder created (`lib/companyInfo.js`)
- [x] Global CSS and layout configured
- [x] README.md created
- 🟡 npm install running — waiting for `@react-pdf/renderer@4.9.0`

## Phase 2: Supabase Setup (Do This)
- [ ] Create Supabase account at supabase.com
- [ ] Create new Supabase project
- [ ] Run schema.sql to create database tables
  - [ ] `leads` table
  - [ ] `lead_comments` table
  - [ ] `services_master` table
  - [ ] `lead_services` table
  - [ ] `estimates` table (versioned)
  - [ ] `estimate_items` table
  - [ ] `estimate_shares` table
- [ ] Create `estimate-pdfs` storage bucket (public)
- [ ] Copy Supabase credentials:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

## Phase 3: Environment Configuration (Do This)
- [ ] Create `.env.local` from `.env.local.example`:
  ```bash
  cd leads-ui/
  cp .env.local.example .env.local
  # Edit with your credentials
  ```
- [ ] Paste Supabase URL and keys
- [ ] Add Anthropic API key (from console.anthropic.com)
- [ ] Add n8n webhook URL (once you set up n8n)

## Phase 4: Company Information (Do This)
- [ ] Edit `leads-ui/lib/companyInfo.js` with:
  - [ ] Your business name
  - [ ] Address
  - [ ] Phone number
  - [ ] Email address

## Phase 5: n8n Workflow Setup (Do This)
### Prerequisites
- [ ] Create n8n account at n8n.cloud (or self-hosted instance)
- [ ] Set up credentials in n8n:
  - [ ] Gmail OAuth2 (enable Gmail API in Google Cloud)
  - [ ] Supabase API credentials
  - [ ] Anthropic Claude API key
  - [ ] SMTP credentials (for email sending)

### Workflows
- [ ] Import `lead-capture-workflow.json`
  - [ ] Update all `REPLACE_WITH_...` placeholders
  - [ ] Verify Gmail field names match output
  - [ ] Test with a sample email
  - [ ] Activate workflow
  
- [ ] Import `estimate-email-share-workflow.json`
  - [ ] Update Supabase credentials
  - [ ] Update SMTP credentials
  - [ ] Activate workflow

## Phase 6: Testing (Do This)
- [ ] npm install completes successfully
- [ ] Run dev server: `npm run dev`
- [ ] Visit http://localhost:3000/leads
- [ ] Mock data loads and displays
- [ ] Test lead detail page
- [ ] (Optional) Test full lead capture flow via email

## Phase 7: Optional Enhancements
- [ ] Add company logo to `public/logo.png`
- [ ] Customize Tailwind colors in `tailwind.config.js`
- [ ] Set up private PDF links (signed URLs instead of public)
- [ ] Add authentication to Next.js app
- [ ] Build lead entry form for manual lead creation

## File Locations Reference
```
/Users/dhawalnayak/Documents/CRM/
├── SETUP_GUIDE.md              ← Detailed setup instructions
├── SETUP_CHECKLIST.md          ← You are here
├── schema.sql                  ← Database schema for Supabase
├── lead-capture-workflow.json  ← n8n workflow (email → Supabase)
├── estimate-email-share-workflow.json  ← n8n workflow (PDF email)
└── leads-ui/
    ├── .env.local.example      ← Copy to .env.local
    ├── .env.local              ← Your secrets (don't commit!)
    ├── lib/
    │   └── companyInfo.js      ← Edit with your details
    ├── app/
    │   ├── layout.js
    │   ├── globals.css
    │   └── leads/
    │       ├── page.js         ← Leads list
    │       └── [id]/
    │           ├── page.js     ← Lead detail
    │           └── LeadDetailClient.js
    ├── components/
    │   ├── EstimatePanel.js
    │   ├── ServiceLineItems.js
    │   ├── CommentsPanel.js
    │   └── pdf/
    │       └── EstimateDocument.js
    └── package.json
```

## Key Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
N8N_EMAIL_SHARE_WEBHOOK_URL=https://n8n.yourinstance.com/webhook/...
ANTHROPIC_API_KEY=sk-ant-...
```

## Commands

### Install and run locally
```bash
cd leads-ui/
npm install
npm run dev
```

### Build for production
```bash
npm run build
npm start
```

## Troubleshooting Quick Links
- npm install fails → Check SETUP_GUIDE.md section 1.1
- PDF generation error → Check SETUP_GUIDE.md "Troubleshooting"
- n8n workflows not triggering → Check SETUP_GUIDE.md Phase 4
- Leads not appearing → Verify Supabase connection and data

---

Last updated: 2026-08-30
