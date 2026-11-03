'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // The reset link signs the user in for this page only; without that session the link has expired or was already used.
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    router.push('/leads');
    router.refresh();
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="card-header">
          <span className="card-title">Choose a new password</span>
        </div>
        <div className="card-body">
          {hasSession === null ? null : !hasSession ? (
            <>
              <p className="empty-note">This reset link has expired or was already used.</p>
              <p className="empty-note auth-switch">
                <Link href="/forgot-password">Request a new link</Link>
              </p>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="password">New password</label>
                <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="confirm">Confirm new password</label>
                <input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="settings-actions">
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Saving…' : 'Save new password'}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
