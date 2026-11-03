-- Overview (the email subject) and the time the email arrived, shown on the leads list.

alter table leads add column if not exists overview text;
alter table leads add column if not exists email_received_at timestamptz;
alter table skipped_emails add column if not exists received_at timestamptz;

-- Backfill: email leads imported before this change start with the subject as the first line of description.
update leads
set overview = nullif(split_part(description, E'\n', 1), '')
where source = 'email' and overview is null;

notify pgrst, 'reload schema';
