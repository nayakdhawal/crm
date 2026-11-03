-- ============================================================
-- Rate card import support
-- Run once in the Supabase SQL editor.
-- ============================================================

-- Running-foot pricing (R.F.T.): priced on length only.
alter type pricing_type add value if not exists 'per_rft';

-- Archived services stay in the table so existing estimates and lead items keep working.
alter table services_master add column if not exists active boolean not null default true;

-- Replace the seeded services: archive them. The new rate card is imported from Settings.
update services_master set active = false;
