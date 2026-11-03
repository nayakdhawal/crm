'use client';

import { useState } from 'react';
import { Spinner } from '@/components/Loader';
import { WORKSPACE_UPDATED_EVENT } from '@/components/AppSidebar';

const NAME_MAX = 10;

export default function WorkspaceSection({ workspace, onSaved }) {
  const [name, setName] = useState(workspace.name ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  function publish(updated) {
    onSaved(updated);
    window.dispatchEvent(new Event(WORKSPACE_UPDATED_EVENT));
  }

  async function handleSaveName(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      publish(data.workspace);
      setMessage({ type: 'ok', text: 'Workspace name saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleFaviconChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('favicon', file);
      const res = await fetch('/api/workspace/favicon', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      publish(data.workspace);
      setMessage({ type: 'ok', text: 'Favicon uploaded.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="card-stack">
      <form className="card" onSubmit={handleSaveName}>
        <div className="card-header">
          <span className="card-title">Workspace name</span>
        </div>
        <div className="card-body">
          <p className="empty-note" style={{ marginBottom: '12px' }}>
            Shown at the top left of the app. Up to {NAME_MAX} characters.
          </p>
          <div className="field">
            <label htmlFor="workspace_name">Name</label>
            <input
              id="workspace_name"
              type="text"
              maxLength={NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="empty-note" style={{ marginTop: '4px' }}>{name.length}/{NAME_MAX}</span>
          </div>
          <div className="settings-actions">
            {message && (
              <span className={message.type === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</span>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
              {saving && <Spinner small />}{saving ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Favicon</span>
        </div>
        <div className="card-body logo-row">
          <div className="logo-preview">
            {workspace.favicon_url
              ? <img src={workspace.favicon_url} alt="Workspace favicon" />
              : <span className="empty-note">No favicon</span>}
          </div>
          <div>
            <label className="btn btn-secondary">
              {uploading ? 'Uploading…' : workspace.favicon_url ? 'Replace favicon' : 'Upload favicon'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
                onChange={handleFaviconChange}
                disabled={uploading}
                hidden
              />
            </label>
            <p className="empty-note" style={{ marginTop: '8px' }}>
              PNG, JPEG, SVG or ICO, up to 512 KB. A square image works best. It shows in the sidebar and the browser tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
