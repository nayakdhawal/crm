-- ============================================================
-- Per-workspace SMTP settings for sending estimate emails
-- Run once in the Supabase SQL editor.
-- ============================================================

alter table business_settings add column if not exists smtp_host text;
alter table business_settings add column if not exists smtp_port int;
alter table business_settings add column if not exists smtp_secure boolean not null default false;
alter table business_settings add column if not exists smtp_user text;
alter table business_settings add column if not exists smtp_password text;
alter table business_settings add column if not exists smtp_from_name text;
alter table business_settings add column if not exists smtp_from_email text;
