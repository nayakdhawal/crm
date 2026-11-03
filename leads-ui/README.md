# Lead Capture & Estimate System

A Next.js application for capturing leads via email, generating estimates, and managing your sales pipeline.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Update Company Information
Edit `lib/companyInfo.js` with your business details.

### 4. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000/leads](http://localhost:3000/leads)

## Setup Instructions

See [SETUP_GUIDE.md](../SETUP_GUIDE.md) in the project root for detailed setup steps including:
- Supabase configuration
- n8n workflow setup
- Environment variables
- Database initialization

## Project Structure

```
leads-ui/
├── app/
│   ├── layout.js           # Root layout
│   ├── globals.css         # Tailwind CSS
│   ├── leads/
│   │   ├── page.js         # Leads list
│   │   └── [id]/
│   │       ├── page.js     # Lead detail page
│   │       └── LeadDetailClient.js
│   └── api/
│       ├── estimates/      # Estimate creation & PDF generation
│       └── share/          # Email sharing endpoints
├── components/
│   ├── ServiceLineItems.js     # Editable service rows
│   ├── EstimatePanel.js        # Estimate preview & PDF generation
│   ├── CommentsPanel.js        # Lead comments
│   ├── StatusBadge.js          # Status display
│   └── pdf/
│       └── EstimateDocument.js # PDF template
├── lib/
│   ├── companyInfo.js      # Company details
│   ├── estimateUtils.js    # Pricing calculations
│   ├── mockData.js         # Mock data (replace with Supabase queries)
│   └── supabase.js         # Supabase client
└── package.json
```

## API Routes

- `POST /api/estimates` — Create new estimate version
- `POST /api/estimates/[id]/pdf` — Generate and upload PDF
- `POST /api/share/email` — Send estimate via email (n8n webhook)
- `POST /api/share/log` — Log WhatsApp share

## Technologies

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend/Database:** Supabase (PostgreSQL)
- **PDF Generation:** @react-pdf/renderer
- **Automation:** n8n (email workflows)
- **AI:** Anthropic Claude API

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
N8N_EMAIL_SHARE_WEBHOOK_URL=your-n8n-webhook
ANTHROPIC_API_KEY=your-anthropic-key
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

Private project for lead capture and estimation.
