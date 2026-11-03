'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/Loader';

const PRESETS = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 465, secure: true },
  { label: 'Outlook / Office 365', host: 'smtp.office365.com', port: 587, secure: false },
  { label: 'Custom', host: '', port: 587, secure: false },
];

const KNOWN_PROVIDERS = {
  'gmail.com': { host: 'smtp.gmail.com', port: 465, secure: true },
  'googlemail.com': { host: 'smtp.gmail.com', port: 465, secure: true },
  'outlook.com': { host: 'smtp.office365.com', port: 587, secure: false },
  'hotmail.com': { host: 'smtp.office365.com', port: 587, secure: false },
  'live.com': { host: 'smtp.office365.com', port: 587, secure: false },
  'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
};

function providerForEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return KNOWN_PROVIDERS[domain] ?? null;
}

const GMAIL_MESSAGES = {
  connected: { type: 'ok', text: 'Google account connected.' },
  cancelled: { type: 'error', text: 'Google sign-in was cancelled.' },
  error: { type: 'error', text: 'Could not connect your Google account. Please try again.' },
  'not-configured': { type: 'error', text: 'Google sign-in is not set up on this server yet.' },
};

export default function EmailSection({ settings, onSaved }) {
  const [gmailMessage, setGmailMessage] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('gmail');
    if (result && GMAIL_MESSAGES[result]) setGmailMessage(GMAIL_MESSAGES[result]);
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disconnect_gmail: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not disconnect');
      onSaved(data.settings);
      setGmailMessage({ type: 'ok', text: 'Google account disconnected.' });
    } catch (err) {
      setGmailMessage({ type: 'error', text: err.message });
    } finally {
      setDisconnecting(false);
    }
  }

  const [form, setForm] = useState({
    smtp_host: settings.smtp_host ?? '',
    smtp_port: settings.smtp_port ?? 587,
    smtp_secure: settings.smtp_secure ?? false,
    smtp_user: settings.smtp_user ?? '',
    smtp_from_name: settings.smtp_from_name ?? '',
    smtp_from_email: settings.smtp_from_email ?? '',
  });
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  function applyPreset(preset) {
    if (!preset.host) return;
    setForm({ ...form, smtp_host: preset.host, smtp_port: preset.port, smtp_secure: preset.secure });
  }

  function handleUserChange(value) {
    const provider = providerForEmail(value.trim());
    setForm({
      ...form,
      smtp_user: value,
      ...(provider ? { smtp_host: provider.host, smtp_port: provider.port, smtp_secure: provider.secure } : {}),
      smtp_from_email: form.smtp_from_email || value,
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const body = { ...form };
      if (password) body.smtp_password = password;
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data.settings);
      setPassword('');
      setMessage({ type: 'ok', text: 'Email settings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/smtp/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      setMessage({ type: 'ok', text: `Test email sent to ${data.sentTo}.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="card-stack">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Google account</span>
        </div>
        <div className="card-body">
          {settings.gmail_connected ? (
            <div className="settings-actions" style={{ marginTop: 0, justifyContent: 'space-between' }}>
              <span>Connected as <strong>{settings.gmail_email}</strong>. Estimates are sent from this account.</span>
              <button type="button" className="btn btn-secondary" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <div className="settings-actions" style={{ marginTop: 0, justifyContent: 'space-between' }}>
              <span className="empty-note">Sign in with Google to send estimates. No password or app setup needed.</span>
              <a className="btn btn-primary" href="/api/auth/google/start">Connect Google account</a>
            </div>
          )}
          {gmailMessage && (
            <p className={gmailMessage.type === 'ok' ? 'form-ok' : 'form-error'} style={{ marginTop: '12px' }}>
              {gmailMessage.text}
            </p>
          )}
        </div>
      </div>

      <form className="card" onSubmit={handleSave}>
      <div className="card-header">
        <span className="card-title">Or send with SMTP</span>
      </div>
      <div className="card-body">
        <p className="empty-note" style={{ marginBottom: '12px' }}>
          Use this if you'd rather send from another email provider. Gmail accounts can use an app password here.
        </p>

        <div className="preset-row">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn btn-secondary" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>

        {form.smtp_host === 'smtp.gmail.com' && (
          <div className="guide">
            <p className="guide-title">Setting up Gmail (about 3 minutes)</p>
            <ol>
              <li>
                Turn on 2-Step Verification in your Google account:{' '}
                <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">Google security settings</a>.
              </li>
              <li>
                Create an app password:{' '}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">Google app passwords</a>.
                Name it "Estimate app" and copy the 16-character code.
              </li>
              <li>Username: your full Gmail address. Port 465 with SSL on (the preset sets these).</li>
              <li>Paste the app password below, click <strong>Save email settings</strong>, then <strong>Send test email</strong>.</li>
            </ol>
            <p className="empty-note">Your normal Google password won't work here. Use the app password.</p>
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label htmlFor="smtp_host">SMTP server</label>
            <input id="smtp_host" value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="smtp_port">Port</label>
            <input id="smtp_port" type="number" value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} />
          </div>
        </div>

        <label className="check-row">
          <input type="checkbox" checked={form.smtp_secure} onChange={(e) => setForm({ ...form, smtp_secure: e.target.checked })} />
          Use SSL (usually port 465). Leave off for port 587.
        </label>

        <div className="field-row" style={{ marginTop: '16px' }}>
          <div className="field">
            <label htmlFor="smtp_user">Username (your email address)</label>
            <input id="smtp_user" type="email" value={form.smtp_user} onChange={(e) => handleUserChange(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="smtp_password">Password</label>
            <input
              id="smtp_password"
              type="password"
              autoComplete="new-password"
              placeholder={settings.smtp_password_set ? 'Saved — enter to replace' : ''}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="smtp_from_name">Sender name</label>
            <input id="smtp_from_name" placeholder={settings.business_name || ''} value={form.smtp_from_name} onChange={(e) => setForm({ ...form, smtp_from_name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="smtp_from_email">From address</label>
            <input id="smtp_from_email" type="email" value={form.smtp_from_email} onChange={(e) => setForm({ ...form, smtp_from_email: e.target.value })} />
          </div>
        </div>

        <div className="settings-actions">
          {message && <span className={message.type === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</span>}
          <button type="button" className="btn btn-secondary" onClick={handleTest} disabled={testing || !(settings.smtp_password_set || settings.gmail_connected)}>
            {testing && <Spinner small />}{testing ? 'Sending…' : 'Send test email'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner small />}{saving ? 'Saving…' : 'Save email settings'}
          </button>
        </div>
      </div>
      </form>
    </div>
  );
}
