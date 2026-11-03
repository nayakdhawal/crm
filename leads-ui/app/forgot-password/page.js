'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
      setBusy(false);
      return;
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="card-header">
          <span className="card-title">Reset your password</span>
        </div>
        <div className="card-body">
          {sent ? (
            <p className="empty-note">
              If an account exists for <strong>{email}</strong>, we sent a link to reset the password. Open it from the same browser.
            </p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="settings-actions">
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Sending…' : 'Send reset link'}
                </button>
              </div>
            </>
          )}
          <p className="empty-note auth-switch">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
