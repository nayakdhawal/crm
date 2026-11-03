'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }
    if (data.session) {
      router.push('/onboarding');
      router.refresh();
    } else {
      setCheckEmail(true);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="card-header">
          <span className="card-title">Create your account</span>
        </div>
        <div className="card-body">
          {checkEmail ? (
            <p className="empty-note">
              We sent a confirmation link to <strong>{email}</strong>. Open it to finish signing up.
            </p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="settings-actions">
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Creating account…' : 'Create account'}
                </button>
              </div>
              <p className="empty-note auth-switch">
                Already have an account? <Link href="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
