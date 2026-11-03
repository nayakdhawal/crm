'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create your workspace');
      router.push('/leads');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="card-header">
          <span className="card-title">Set up your business</span>
        </div>
        <div className="card-body">
          <p className="empty-note" style={{ marginBottom: '16px' }}>
            Your leads, services, and estimates are kept separate from every other business. You can add your details in Settings afterwards.
          </p>
          <div className="field">
            <label htmlFor="business_name">Business name</label>
            <input id="business_name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="settings-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={busy || !name.trim()}>
              {busy ? 'Setting up…' : 'Continue'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
