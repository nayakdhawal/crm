-- ============================================================
-- Lead import from email: keyword rules and duplicate protection
-- Run once in the Supabase SQL editor.
-- ============================================================

alter table business_settings add column if not exists lead_include_keywords text[] not null default '{}';
alter table business_settings add column if not exists lead_exclude_keywords text[] not null default '{}';
alter table business_settings add column if not exists lead_blocked_senders text[] not null default '{}';

-- Id of the email a lead was imported from, so the same email is never imported twice.
alter table leads add column if not exists source_message_id text;

create unique index if not exists idx_leads_source_message
  on leads(workspace_id, source_message_id)
  where source_message_id is not null;

-- Refresh the API's schema cache so the new columns are visible immediately.
notify pgrst, 'reload schema';
