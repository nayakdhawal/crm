'use client';

import { useState } from 'react';

const PROVIDERS = [
  {
    value: 'anthropic',
    label: 'Anthropic (Claude)',
    keyHint: 'sk-ant-…',
    models: [
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (recommended)' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest, lowest cost)' },
      { value: 'claude-opus-5', label: 'Claude Opus 5 (most capable)' },
    ],
  },
  {
    value: 'openai',
    label: 'OpenAI (ChatGPT)',
    keyHint: 'sk-…',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o mini (recommended, lowest cost)' },
      { value: 'gpt-4o', label: 'GPT-4o (more capable)' },
    ],
  },
];

export default function AiSection({ settings, onSaved }) {
  const [provider, setProvider] = useState(settings.ai_provider || 'anthropic');
  const [model, setModel] = useState(settings.ai_model || PROVIDERS.find((p) => p.value === (settings.ai_provider || 'anthropic')).models[0].value);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const current = PROVIDERS.find((p) => p.value === provider);

  function handleProviderChange(value) {
    setProvider(value);
    setModel(PROVIDERS.find((p) => p.value === value).models[0].value);
  }

  async function save(body, successText) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data.settings);
      setApiKey('');
      setMessage({ type: 'ok', text: successText });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function handleSaveConfig(e) {
    e.preventDefault();
    save({ ai_provider: provider, ai_model: model }, 'AI settings saved.');
  }

  function handleSaveKey(e) {
    e.preventDefault();
    save({ ai_provider: provider, ai_model: model, ai_api_key: apiKey }, 'API key saved.');
  }

  function handleRemoveKey() {
    if (!window.confirm('Remove the saved API key? AI features will stop working until you add one.')) return;
    save({ clear_ai_key: true }, 'API key removed.');
  }

  return (
    <div className="card-stack">
      <form className="card" onSubmit={handleSaveConfig}>
        <div className="card-header">
          <span className="card-title">AI provider</span>
        </div>
        <div className="card-body">
          <div className="field-row">
            <div className="field">
              <label htmlFor="ai_provider">Provider</label>
              <select id="ai_provider" value={provider} onChange={(e) => handleProviderChange(e.target.value)}>
                {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ai_model">Model</label>
              <select id="ai_model" value={model} onChange={(e) => setModel(e.target.value)}>
                {(current.models.some((m) => m.value === model)
                  ? current.models
                  : [{ value: model, label: `${model} (saved)` }, ...current.models]
                ).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="settings-actions">
            {message && <span className={message.type === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</span>}
            <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
          </div>
        </div>
      </form>

      <form className="card" onSubmit={handleSaveKey}>
        <div className="card-header">
          <span className="card-title">API key</span>
        </div>
        <div className="card-body">
          <p className="empty-note" style={{ marginBottom: '12px' }}>
            {settings.ai_key_set
              ? `A key is saved (ending in ${settings.ai_key_hint}). For security it is never shown again. Enter a new key to replace it.`
              : 'No key saved. AI features are off until you add one.'}
          </p>
          <div className="field">
            <label htmlFor="ai_api_key">New API key</label>
            <input
              id="ai_api_key"
              type="password"
              autoComplete="off"
              placeholder={current.keyHint}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="settings-actions">
            {settings.ai_key_set && (
              <button type="button" className="btn btn-secondary" onClick={handleRemoveKey} disabled={saving}>
                Remove key
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving || !apiKey.trim()}>
              Save key
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
