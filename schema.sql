-- ============================================================
-- Lead Capture + Estimate Generation System
-- Supabase (Postgres) schema
-- ============================================================

-- ---------- ENUMS ----------
create type lead_source as enum ('email', 'manual');
create type lead_status as enum ('new', 'contacted', 'estimate_previewed', 'estimate_sent', 'follow_up', 'won', 'lost');
create type pricing_type as enum ('flat', 'per_sqft', 'per_sqinch');
create type estimate_status as enum ('draft', 'sent', 'superseded', 'accepted', 'rejected');
create type share_channel as enum ('email', 'whatsapp');
create type lead_origin as enum ('Referral', 'Website', 'Social Media', 'Walk-in', 'Advertisement', 'Cold Call', 'Other');

-- ---------- LEADS ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  source lead_source not null,
  sender_name text,
  sender_email text,
  phone text,
  location text,
  description text,
  raw_email_body text,
  status lead_status not null default 'new',
  callback_date timestamptz,
  lead_date date,                       -- when the lead was acquired/created
  opportunity_score numeric(5,2),       -- 0-100 score
  lead_value numeric(12,2),             -- expected deal size
  currency text default 'INR',          -- currency for lead_value
  lead_origin lead_origin,              -- where lead came from
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_status on leads(status);
create index idx_leads_callback_date on leads(callback_date);
create index idx_leads_lead_date on leads(lead_date);

-- ---------- ACTIVITY LOG (comprehensive event tracking) ----------
create type activity_type as enum ('lead_created', 'status_change', 'estimate_generated', 'estimate_shared', 'comment');

create table lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  activity_type activity_type not null,
  comment_text text,                    -- for 'comment' type
  status_from lead_status,              -- for 'status_change' type
  status_to lead_status,                -- for 'status_change' type
  estimate_version int,                 -- for 'estimate_generated' and 'estimate_shared' types
  share_channel share_channel,          -- for 'estimate_shared' type
  share_recipient text,                 -- for 'estimate_shared' type (email/whatsapp)
  created_at timestamptz not null default now()
);

create index idx_lead_activity_lead_id on lead_activity(lead_id);
create index idx_lead_activity_created_at on lead_activity(created_at desc);

-- ---------- LEAD COMMENTS (deprecated - use lead_activity instead, kept for backwards compat) ----------
create table lead_comments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  comment_text text not null,
  created_at timestamptz not null default now()
);

create index idx_lead_comments_lead_id on lead_comments(lead_id);

-- ---------- SERVICES MASTER (the rate file) ----------
create table services_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  pricing_type pricing_type not null default 'flat',
  rate numeric(12,2) not null,       -- per unit / per sqft / per sqinch depending on pricing_type
  unit_label text,                   -- e.g. 'per piece', 'per sqft', 'per sqinch'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- LEAD SERVICES (AI-extracted or manually added, pre-estimate) ----------
create table lead_services (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  service_id uuid not null references services_master(id),
  quantity numeric(12,2) default 1,  -- used when pricing_type = 'flat'
  length numeric(12,2),              -- used when pricing_type = per_sqft/per_sqinch
  width numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_lead_services_lead_id on lead_services(lead_id);

-- ---------- ESTIMATES (versioned) ----------
create table estimates (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  version int not null,
  status estimate_status not null default 'draft',
  subtotal numeric(12,2),
  tax numeric(12,2),
  total numeric(12,2),
  pdf_url text,
  created_at timestamptz not null default now(),
  unique (lead_id, version)
);

create index idx_estimates_lead_id on estimates(lead_id);

-- ---------- ESTIMATE ITEMS (snapshotted rates/line items) ----------
create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  service_id uuid not null references services_master(id),
  pricing_type pricing_type not null,
  rate_at_time numeric(12,2) not null,
  quantity numeric(12,2),
  length numeric(12,2),
  width numeric(12,2),
  computed_area numeric(12,2),       -- length * width, for area-based pricing
  line_total numeric(12,2) not null
);

create index idx_estimate_items_estimate_id on estimate_items(estimate_id);

-- ---------- ESTIMATE SHARES (email / whatsapp log) ----------
create table estimate_shares (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  channel share_channel not null,
  recipient text,
  shared_at timestamptz not null default now()
);

create index idx_estimate_shares_estimate_id on estimate_shares(estimate_id);

-- ---------- updated_at trigger helper ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_leads_updated_at before update on leads
  for each row execute function set_updated_at();

create trigger trg_services_master_updated_at before update on services_master
  for each row execute function set_updated_at();
