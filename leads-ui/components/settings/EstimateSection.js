'use client';

import { useState } from 'react';
import { Spinner } from '@/components/Loader';

export default function EstimateSection({ settings, onSaved }) {
  const [header, setHeader] = useState(settings.estimate_header ?? '');
  const [footer, setFooter] = useState(settings.estimate_footer ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSaveText(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimate_header: header, estimate_footer: footer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data.settings);
      setMessage({ type: 'ok', text: 'Estimate text saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('logo', file);
      const res = await fetch('/api/settings/logo', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onSaved(data.settings);
      setMessage({ type: 'ok', text: 'Logo uploaded.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="card-stack">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Logo</span>
        </div>
        <div className="card-body logo-row">
          <div className="logo-preview">
            {settings.logo_url
              ? <img src={settings.logo_url} alt="Business logo" />
              : <span className="empty-note">No logo</span>}
          </div>
          <div>
            <label className="btn btn-secondary">
              {uploading ? 'Uploading…' : settings.logo_url ? 'Replace logo' : 'Upload logo'}
              <input type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} disabled={uploading} hidden />
            </label>
            <p className="empty-note" style={{ marginTop: '8px' }}>PNG or JPEG, up to 2 MB.</p>
          </div>
        </div>
      </div>

      <form className="card" onSubmit={handleSaveText}>
        <div className="card-header">
          <span className="card-title">Header and footer</span>
        </div>
        <div className="card-body">
          <div className="field">
            <label htmlFor="estimate_header">Header note (shown under the business details)</label>
            <textarea id="estimate_header" rows="3" value={header} onChange={(e) => setHeader(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="estimate_footer">Footer (shown at the bottom of the estimate)</label>
            <textarea id="estimate_footer" rows="3" value={footer} onChange={(e) => setFooter(e.target.value)} />
          </div>
          <div className="settings-actions">
            {message && <span className={message.type === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</span>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Spinner small />}{saving ? 'Saving…' : 'Save text'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
