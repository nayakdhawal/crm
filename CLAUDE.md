# Lead Capture & Estimate System — Project Context

## Stack
- Frontend: Next.js (JavaScript, App Router), Tailwind CSS (no component library)
- Backend/DB: Supabase (Postgres + Storage)
- Automation: n8n (email watching, AI extraction, email sending)
- PDF generation: @react-pdf/renderer
- AI extraction: Anthropic Claude API (model: claude-sonnet-4-6)

## What's built so far

**1. Database schema** (`schema.sql`)
Tables: `leads`, `lead_comments`, `services_master`, `lead_services`, `estimates` (versioned), `estimate_items`, `estimate_shares`. Enums for status/pricing/channel. Trigger for `updated_at`.

**2. Next.js UI** (`leads-ui/`)
- `app/leads/page.js` — leads list
- `app/leads/[id]/page.js` + `LeadDetailClient.js` — lead detail: status/callback controls, editable service line items, live estimate preview, comments
- `components/ServiceLineItems.js` — editable AI-extracted service rows, computes line totals live (flat / per_sqft / per_sqinch)
- `components/EstimatePanel.js` — preview, "Generate PDF", version history, share buttons (WhatsApp link + email)
- `components/CommentsPanel.js`, `components/StatusBadge.js`
- `lib/estimateUtils.js` — shared pricing math (`computeLineTotal`, `computeEstimateTotals`)
- `lib/leadData.js` — server-side Supabase queries used by the lead detail page

**3. API routes**
- `POST /api/estimates` — snapshots a new estimate version + line items, supersedes the previous version, recomputes totals server-side (never trusts client-sent totals)
- `POST /api/estimates/[estimateId]/pdf` — renders PDF via `components/pdf/EstimateDocument.js`, uploads to Supabase Storage bucket `estimate-pdfs`, saves `pdf_url`
- `POST /api/share/email` — proxies to the n8n email-share webhook (keeps webhook URL server-side only)
- `POST /api/share/log` — logs WhatsApp shares to `estimate_shares` (email logs itself via n8n after a confirmed send)

**4. n8n workflows**
- `lead-capture-workflow.json` — Gmail trigger → insert lead → fetch `services_master` → Claude extracts requested services → match to real service IDs → insert `lead_services`
- `estimate-email-share-workflow.json` — webhook → download PDF → send email (SMTP) → log share → update estimate + lead status

## Key design decisions
- Rates are snapshotted onto `estimate_items` at generation time (`rate_at_time`), so a later rate change in `services_master` never retroactively alters a past estimate.
- Estimates are versioned, not overwritten — old versions get `status: superseded`.
- Lead status flow: `new → contacted → estimate_previewed → estimate_sent → follow_up → won/lost`.
- Comments are manual UI-only entry — not automated from email replies (deliberate v1 scope limit).
- WhatsApp sharing uses a `wa.me` link, not the WhatsApp Business API (deliberate v1 scope limit).
- Email sending happens via n8n/SMTP, not directly from Next.js, to keep credentials and attachment handling in one place.

## Setup still needed
- `npm install @supabase/supabase-js @react-pdf/renderer`
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `N8N_EMAIL_SHARE_WEBHOOK_URL`
- Supabase Storage bucket `estimate-pdfs` (public — or switch `getPublicUrl` to `createSignedUrl` if it should be private)
- n8n credentials: Gmail OAuth2, Supabase API, Anthropic API key, SMTP — all marked `REPLACE_WITH_...` in the workflow JSONs
- Business details, logo, and estimate header/footer are set in the Settings page (`business_settings` table, see `schema_settings.sql`)
- Double-check Gmail Trigger's actual output field names against `components... Format Email Data` node's assumptions after first import

## Not yet built / open items
- Master rate file management UI (add/edit `services_master` rows from the UI instead of directly in Supabase)
- Manual lead entry form (mentioned early in planning, not yet built — currently leads only arrive via the email workflow)
- Any auth/access control on the Next.js UI itself
- Error-path handling in the n8n workflows (currently happy-path only)
