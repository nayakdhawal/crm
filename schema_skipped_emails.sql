-- ============================================================
-- Review queue for emails the lead rules skipped
-- Run once in the Supabase SQL editor.
-- ============================================================

create table if not exists skipped_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_message_id text not null,
  sender_name text,
  sender_email text,
  subject text,
  body text,
  skip_reason text not null,
  status text not null default 'pending' check (status in ('pending', 'converted', 'dismissed')),
  lead_id uuid references leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_skipped_emails_message
  on skipped_emails(workspace_id, source_message_id);

create index if not exists idx_skipped_emails_status on skipped_emails(workspace_id, status);

alter table skipped_emails enable row level security;

drop policy if exists "members manage skipped emails" on skipped_emails;
create policy "members manage skipped emails" on skipped_emails
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

notify pgrst, 'reload schema';
