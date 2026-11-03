-- ============================================================
-- Google account connection (send estimates via Gmail API)
-- Run once in the Supabase SQL editor.
-- ============================================================

alter table business_settings add column if not exists gmail_email text;
alter table business_settings add column if not exists gmail_refresh_token text;
