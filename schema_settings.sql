-- ============================================================
-- Business settings (single row) + AI configuration
-- Run once in the Supabase SQL editor.
-- ============================================================

create table if not exists business_settings (
  id int primary key default 1 check (id = 1),
  business_name text,
  address text,
  phone text,
  email text,
  website text,
  tax_id text,
  logo_url text,
  estimate_header text,
  estimate_footer text,
  ai_provider text not null default 'anthropic' check (ai_provider in ('anthropic', 'openai')),
  ai_model text,
  ai_api_key text,
  updated_at timestamptz not null default now()
);

insert into business_settings (id) values (1) on conflict (id) do nothing;

create trigger trg_business_settings_updated_at before update on business_settings
  for each row execute function set_updated_at();
