-- ============================================================
-- Per-workspace email templates for estimate emails
-- Run once in the Supabase SQL editor.
-- ============================================================

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  subject text not null default '',
  body text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_templates_workspace on email_templates(workspace_id);

alter table email_templates enable row level security;

drop policy if exists "members manage email templates" on email_templates;
create policy "members manage email templates" on email_templates
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
