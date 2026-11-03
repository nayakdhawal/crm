-- ============================================================
-- Keep the order of requested services and estimate line items
-- Run once in the Supabase SQL editor.
-- ============================================================

alter table lead_services add column if not exists position int not null default 0;
alter table estimate_items add column if not exists position int not null default 0;
