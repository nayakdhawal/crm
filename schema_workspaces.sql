-- ============================================================
-- Accounts and workspaces (multi-tenant)
-- Run once in the Supabase SQL editor.
-- ============================================================

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Existing single-business data moves into this placeholder workspace.
-- After you sign up, attach your account to it (see the note at the end of this file).
insert into workspaces (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Existing business')
on conflict (id) do nothing;

alter table leads add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table lead_activity add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table lead_comments add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table services_master add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table lead_services add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table estimates add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table estimate_items add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table estimate_shares add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table business_settings add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

update leads set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;
update lead_activity set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;
update lead_comments set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;
update services_master set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;
update lead_services set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;
update estimates set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;
update estimate_items set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;
update estimate_shares set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;
update business_settings set workspace_id = '00000000-0000-0000-0000-000000000001' where workspace_id is null;

alter table leads alter column workspace_id set not null;
alter table lead_activity alter column workspace_id set not null;
alter table lead_comments alter column workspace_id set not null;
alter table services_master alter column workspace_id set not null;
alter table lead_services alter column workspace_id set not null;
alter table estimates alter column workspace_id set not null;
alter table estimate_items alter column workspace_id set not null;
alter table estimate_shares alter column workspace_id set not null;
alter table business_settings alter column workspace_id set not null;

-- One settings row per workspace; ids move from a fixed 1 to a sequence.
alter table business_settings drop constraint if exists business_settings_id_check;
create sequence if not exists business_settings_id_seq start 2;
alter table business_settings alter column id set default nextval('business_settings_id_seq');
create unique index if not exists business_settings_workspace_key on business_settings(workspace_id);

create index if not exists idx_leads_workspace on leads(workspace_id);
create index if not exists idx_services_workspace on services_master(workspace_id);

-- Membership check used by every row-level security policy.
create or replace function is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- Creates a workspace for the signed-in user and makes them its owner.
create or replace function create_workspace(workspace_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into workspaces (name) values (workspace_name) returning id into new_id;
  insert into workspace_members (workspace_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into business_settings (workspace_id, business_name) values (new_id, workspace_name);
  return new_id;
end;
$$;

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table leads enable row level security;
alter table lead_activity enable row level security;
alter table lead_comments enable row level security;
alter table services_master enable row level security;
alter table lead_services enable row level security;
alter table estimates enable row level security;
alter table estimate_items enable row level security;
alter table estimate_shares enable row level security;
alter table business_settings enable row level security;

create policy "members read their workspaces" on workspaces
  for select using (is_workspace_member(id));

create policy "members read their memberships" on workspace_members
  for select using (user_id = auth.uid());

create policy "members manage leads" on leads
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "members manage lead activity" on lead_activity
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "members manage lead comments" on lead_comments
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "members manage services" on services_master
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "members manage lead services" on lead_services
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "members manage estimates" on estimates
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "members manage estimate items" on estimate_items
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "members manage estimate shares" on estimate_shares
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "members manage business settings" on business_settings
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- ------------------------------------------------------------
-- After you sign up for the first time, attach your account to the existing data.
-- Replace the email below with the one you signed up with, then run this:
--
-- insert into workspace_members (workspace_id, user_id, role)
-- select '00000000-0000-0000-0000-000000000001', id, 'owner'
-- from auth.users where email = 'you@example.com';
-- ------------------------------------------------------------
