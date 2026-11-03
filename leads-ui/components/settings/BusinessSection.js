'use client';

import { useState } from 'react';
import { Spinner } from '@/components/Loader';

const FIELDS = [
  { key: 'business_name', label: 'Business name', span: 'full' },
  { key: 'address', label: 'Address', span: 'full', multiline: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'website', label: 'Website' },
  { key: 'tax_id', label: 'GST / Tax ID' },
];

export default function BusinessSection({ settings, onSaved }) {
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, settings[f.key] ?? ''])));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data.settings);
      setMessage({ type: 'ok', text: 'Business details saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSave}>
      <div className="card-header">
        <span className="card-title">Business details</span>
      </div>
      <div className="card-body">
        <p className="empty-note" style={{ marginBottom: '16px' }}>
          Shown at the top of every estimate PDF.
        </p>
        <div className="field-row">
          {FIELDS.map((f) => (
            <div key={f.key} className={`field${f.span === 'full' ? ' field-full' : ''}`}>
              <label htmlFor={f.key}>{f.label}</label>
              {f.multiline ? (
                <textarea
                  id={f.key}
                  rows="2"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  id={f.key}
                  type={f.type || 'text'}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        <div className="settings-actions">
          {message && <span className={message.type === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</span>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner small />}{saving ? 'Saving…' : 'Save details'}
          </button>
        </div>
      </div>
    </form>
  );
}
