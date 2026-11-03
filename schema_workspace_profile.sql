-- Workspace name (set in Settings → Workspace) and favicon shown in the app's sidebar and browser tab.

alter table workspaces add column if not exists favicon_url text;

create policy "members update their workspace" on workspaces
  for update using (is_workspace_member(id)) with check (is_workspace_member(id));

notify pgrst, 'reload schema';
