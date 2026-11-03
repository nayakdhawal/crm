# Lead Capture & Estimate System — Setup Guide

## ✅ Completed
- [x] Node.js project initialized
- [x] Next.js, Tailwind CSS, and dependencies configured
- [x] Config files created (next.config.js, tailwind.config.js, jsconfig.json)
- [x] Global CSS and layout.js set up
- [x] Dependencies installing (npm install running)

## 📋 Next Steps

### 1. Set Up Supabase

#### 1.1 Create Supabase Project
- Go to [supabase.com](https://supabase.com)
- Sign up or log in
- Click "New Project"
- Choose a name (e.g., "lead-capture-crm")
- Create a strong database password
- Select your region
- Wait for the project to initialize (2-3 minutes)

#### 1.2 Create Database Tables
- In Supabase, go to **SQL Editor**
- Click **New Query**
- Copy the contents of `/Users/dhawalnayak/Documents/CRM/schema.sql`
- Paste it into the SQL editor
- Click **Run**
- All tables should be created automatically

#### 1.3 Create Storage Bucket
- In Supabase, go to **Storage** (left sidebar)
- Click **Create a new bucket**
- Name it: `estimate-pdfs`
- Select **Public** (or Private if you'll use signed URLs later)
- Click **Create**

#### 1.4 Get Your Credentials
- Go to **Settings** → **API**
- Copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 2. Set Up Environment Variables

#### 2.1 Create `.env.local` in `leads-ui/` directory
Copy `.env.local.example` and fill in with your actual values:

```bash
cd /Users/dhawalnayak/Documents/CRM/leads-ui
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials and n8n webhook URL
```

Example `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
N8N_EMAIL_SHARE_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/estimate-email-share
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Update Company Info

Edit `/Users/dhawalnayak/Documents/CRM/leads-ui/lib/companyInfo.js`:

```javascript
export const COMPANY = {
  name: "Your Business Name",
  address: "123 Business Street, City, State - 000000",
  phone: "+1 (555) 123-4567",
  email: "hello@yourbusiness.com",
};
```

### 4. Set Up n8n Workflows

#### 4.1 Create n8n Account
- Go to [n8n.cloud](https://n8n.cloud) or self-host n8n
- Sign up and create an account

#### 4.2 Set Up Credentials in n8n
Before importing workflows, you'll need to set up credentials:

1. **Gmail OAuth2**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable "Gmail API"
   - Create OAuth 2.0 credentials (Desktop app)
   - In n8n: Add Gmail credentials with your OAuth client ID & secret

2. **Supabase API**
   - In n8n: Add Supabase credentials
   - URL: Your `NEXT_PUBLIC_SUPABASE_URL`
   - Key: Your `SUPABASE_SERVICE_ROLE_KEY`

3. **Anthropic (Claude)**
   - In n8n: Add Anthropic credentials
   - API Key: Get from [console.anthropic.com](https://console.anthropic.com)

4. **SMTP (Email Sending)**
   - In n8n: Add SMTP credentials
   - Host, port, username, password from your email provider
   - Example for Gmail: smtp.gmail.com:587 (TLS)

#### 4.3 Import Workflows

1. In n8n, go to **Workflows**
2. Click **Import**
3. Upload `/Users/dhawalnayak/Documents/CRM/lead-capture-workflow.json`
   - This watches Gmail inbox → extracts services → inserts into Supabase
   - **Update placeholders:**
     - Replace `REPLACE_WITH_...` markers with actual credential IDs from n8n
     - Check Gmail trigger field names match your Gmail output
4. Repeat for `/Users/dhawalnayak/Documents/CRM/estimate-email-share-workflow.json`
   - This handles email sharing of estimates
   - Update SMTP and Supabase credentials

#### 4.4 Activate Workflows
- Click **Activate** on each workflow
- Set up Gmail trigger to watch your inbox

### 5. Test Your Setup

#### 5.1 Start the Next.js Dev Server
```bash
cd /Users/dhawalnayak/Documents/CRM/leads-ui
npm run dev
```
- Visit [http://localhost:3000/leads](http://localhost:3000/leads)
- Should see an empty leads list (or mock data if enabled)

#### 5.2 Test Lead Capture (Optional)
- Send a test email to your Gmail inbox with a message like:
  ```
  Hi, I need a 100 sqft painting job and a window installation. 
  Budget: $500-1000
  ```
- Wait 2-3 minutes for the n8n workflow to process
- Check the Supabase `leads` table to see if the lead was inserted
- Refresh the Next.js app — new lead should appear

#### 5.3 Test Estimate Generation
- Click on a lead
- Add service line items (should auto-populate from lead capture)
- Update quantities/dimensions
- Click "Generate PDF" button
- PDF should be created and stored in Supabase Storage

## 🔧 Troubleshooting

### Dependencies failed to install
```bash
cd /Users/dhawalnayak/Documents/CRM/leads-ui
rm -rf node_modules package-lock.json
npm install
```

### "Cannot find module @supabase/supabase-js"
- Ensure `npm install` completed without errors
- Run `npm install @supabase/supabase-js @react-pdf/renderer` manually

### PDF generation fails
- Check that Supabase Storage bucket `estimate-pdfs` exists and is public
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`

### n8n workflows not triggering
- Verify Gmail OAuth is authorized
- Check n8n execution logs for specific error messages
- Ensure Supabase credentials are correct in n8n

### Estimate not showing in PDF
- Verify `serviceItems` array has entries
- Check console logs in `/app/api/estimates/[estimateId]/pdf/route.js`

## 📚 Additional Configuration (Optional)

### Private PDF Links
To make PDFs private instead of public:
1. In `app/api/estimates/[estimateId]/pdf/route.js`, replace:
   ```javascript
   const { data: { publicUrl } } = supabase.storage.from('estimate-pdfs').getPublicUrl(...)
   ```
   with:
   ```javascript
   const { data: { signedUrl } } = await supabase.storage.from('estimate-pdfs').createSignedUrl(...)
   ```

### Database Backups
- Supabase offers automatic daily backups
- Configure in **Settings** → **Database** → **Backups**

### Rate Management UI
- Currently, rates are edited directly in Supabase `services_master` table
- Future: Build a UI in Next.js to manage rates from the app

## 📞 Support

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [nextjs.org](https://nextjs.org)
- **n8n Docs:** [docs.n8n.io](https://docs.n8n.io)
- **Anthropic Claude API:** [console.anthropic.com](https://console.anthropic.com)

---

**Last updated:** 2026-08-30
