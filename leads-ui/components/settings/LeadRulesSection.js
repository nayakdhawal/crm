'use client';

import { useState } from 'react';
import { Spinner } from '@/components/Loader';
import TagInput from '@/components/TagInput';

export default function LeadRulesSection({ settings, onSaved }) {
  const [include, setInclude] = useState(settings.lead_include_keywords ?? []);
  const [exclude, setExclude] = useState(settings.lead_exclude_keywords ?? []);
  const [blocked, setBlocked] = useState(settings.lead_blocked_senders ?? []);
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
        body: JSON.stringify({
          lead_include_keywords: include,
          lead_exclude_keywords: exclude,
          lead_blocked_senders: blocked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data.settings);
      setInclude(data.settings.lead_include_keywords);
      setExclude(data.settings.lead_exclude_keywords);
      setBlocked(data.settings.lead_blocked_senders);
      setMessage({ type: 'ok', text: 'Lead rules saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSave}>
      <div className="card-header">
        <span className="card-title">Lead rules</span>
      </div>
      <div className="card-body">
        <p className="empty-note" style={{ marginBottom: '12px' }}>
          Emails in your inbox become leads when they match these rules. Press Enter or comma after each word.
          Rules apply the next time you click <strong>Check inbox</strong> on the Leads page.
        </p>

        <div className="field">
          <label htmlFor="lead_include">Only import emails containing any of these words</label>
          <TagInput id="lead_include" value={include} onChange={setInclude} placeholder="e.g. estimate, quote, renovation" />
          <p className="empty-note">Leave empty to import every email (apart from the exclusions below).</p>
        </div>

        <div className="field">
          <label htmlFor="lead_exclude">Skip emails containing any of these words</label>
          <TagInput id="lead_exclude" value={exclude} onChange={setExclude} placeholder="e.g. unsubscribe, invoice, newsletter" />
        </div>

        <div className="field">
          <label htmlFor="lead_blocked">Never import from these senders</label>
          <TagInput id="lead_blocked" value={blocked} onChange={setBlocked} placeholder="e.g. @spam.com or name@example.com" />
          <p className="empty-note">Use @domain.com for a whole domain, or a full address for one person.</p>
        </div>

        <div className="settings-actions">
          {message && <span className={message.type === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</span>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner small />}{saving ? 'Saving…' : 'Save lead rules'}
          </button>
        </div>
      </div>
    </form>
  );
}
