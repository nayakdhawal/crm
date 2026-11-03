'use client';

import { useEffect, useState } from 'react';
import Loader, { Spinner } from '@/components/Loader';
import { MERGE_TAGS, DEFAULT_TEMPLATE } from '@/lib/emailTemplates';

const BLANK = { id: null, name: '', subject: '', body: '', is_default: false };

export default function TemplatesSection() {
  const [templates, setTemplates] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch('/api/email-templates')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load templates');
        setTemplates(data.templates);
        setDraft(data.templates[0] ?? null);
      })
      .catch((err) => setMessage({ type: 'error', text: err.message }));
  }, []);

  function select(template) {
    setDraft({ ...template });
    setMessage(null);
  }

  function startNew() {
    setDraft({ ...BLANK, name: 'New template', subject: DEFAULT_TEMPLATE.subject, body: DEFAULT_TEMPLATE.body });
    setMessage(null);
  }

  function insertTag(tag) {
    setDraft((prev) => ({ ...prev, body: `${prev.body}{{${tag}}}` }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload = { name: draft.name, subject: draft.subject, body: draft.body, is_default: draft.is_default };
    try {
      const url = draft.id ? `/api/email-templates/${draft.id}` : '/api/email-templates';
      const res = await fetch(url, {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      const saved = data.template;
      setTemplates((prev) => {
        const others = (prev ?? []).filter((t) => t.id !== saved.id);
        const list = saved.is_default ? others.map((t) => ({ ...t, is_default: false })) : others;
        return [...list, saved].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
      setDraft(saved);
      setMessage({ type: 'ok', text: 'Template saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft?.id) return;
    if (!window.confirm(`Delete the template "${draft.name}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/email-templates/${draft.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      const remaining = templates.filter((t) => t.id !== draft.id);
      setTemplates(remaining);
      setDraft(remaining[0] ?? null);
      setMessage({ type: 'ok', text: 'Template deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!templates) {
    return message?.type === 'error'
      ? <p className="form-error">{message.text}</p>
      : <Loader label="Loading templates…" />;
  }

  return (
    <div className="card-stack">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Email templates</span>
          <button type="button" className="link-btn" onClick={startNew}>New template</button>
        </div>
        <div className="card-body">
          <p className="empty-note" style={{ marginBottom: '12px' }}>
            Pick a template when you email an estimate. The default is preselected. Tags like {'{{customer_name}}'} are filled in when the email is sent.
          </p>
          <div className="preset-row">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`btn ${draft?.id === t.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => select(t)}
              >
                {t.name}{t.is_default ? ' (default)' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {draft && (
        <form className="card" onSubmit={handleSave}>
          <div className="card-header">
            <span className="card-title">{draft.id ? 'Edit template' : 'New template'}</span>
          </div>
          <div className="card-body">
            <div className="field">
              <label htmlFor="tpl_name">Template name</label>
              <input id="tpl_name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="tpl_subject">Subject</label>
              <input id="tpl_subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="tpl_body">Message</label>
              <textarea id="tpl_body" rows={10} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </div>
            <div className="merge-tags">
              <span className="empty-note">Insert:</span>
              {MERGE_TAGS.map((m) => (
                <button key={m.tag} type="button" className="merge-tag" onClick={() => insertTag(m.tag)} title={`{{${m.tag}}}`}>
                  {m.label}
                </button>
              ))}
            </div>

            <label className="check-row" style={{ marginTop: '16px' }}>
              <input type="checkbox" checked={draft.is_default} onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })} />
              Use as the default template
            </label>

            <div className="settings-actions">
              {message && <span className={message.type === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</span>}
              {draft.id && (
                <button type="button" className="btn btn-secondary" onClick={handleDelete} disabled={saving}>Delete</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving && <Spinner small />}{saving ? 'Saving…' : 'Save template'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
