'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import Loader, { Spinner } from '@/components/Loader';
import { REASON_LABELS } from '@/lib/leadRules';

const STATUSES = ['pending', 'converted', 'dismissed'];

export default function SkippedEmailDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState('pending');
  const [email, setEmail] = useState(null);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);
  const [actionError, setActionError] = useState(null);

  // The list the arrows move through is the tab the user came from (To review by default).
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('status');
    if (STATUSES.includes(requested)) setStatus(requested);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setEmail(null);
    setError(null);
    setActionError(null);

    Promise.all([
      fetch(`/api/skipped-emails/${id}`),
      fetch(`/api/skipped-emails?status=${status}`),
    ])
      .then(async ([emailRes, listRes]) => {
        const emailData = await emailRes.json();
        const listData = await listRes.json();
        if (!emailRes.ok) throw new Error(emailData.error || 'Could not load this email');
        if (!listRes.ok) throw new Error(listData.error || 'Could not load the list');
        if (!cancelled) {
          setEmail(emailData.email);
          setQueue(listData.emails);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [id, status]);

  const index = queue.findIndex((e) => e.id === id);
  // "Previous" goes to the newer email in the list, "Next" to the older one.
  const previous = index > 0 ? queue[index - 1] : null;
  const next = index >= 0 && index < queue.length - 1 ? queue[index + 1] : null;

  function go(target) {
    if (target) router.push(`/skipped/${target.id}?status=${status}`);
  }

  // Keyboard arrows move between emails too, unless the user is typing.
  useEffect(() => {
    function onKey(e) {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') go(previous);
      if (e.key === 'ArrowRight') go(next);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function act(action) {
    setActing(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/skipped-emails/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      // Move on to the next email to review; go back to the list when there are none left.
      const destination = next ?? previous;
      if (destination) router.push(`/skipped/${destination.id}?status=pending`);
      else router.push(`/skipped?status=pending`);
    } catch (err) {
      setActionError(err.message);
      setActing(null);
    }
  }

  const isPending = email?.status === 'pending';

  return (
    <div className="app">
      <AppSidebar active="skipped" />

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">Skipped email</div>
        </header>
        <main className="content">
          <section className="view-pad">
            <div className="email-nav">
              <button className="link-btn" onClick={() => router.push(`/skipped?status=${status}`)}>
                ← Back to list
              </button>
              <div className="email-nav-arrows">
                <button
                  className="icon-btn"
                  aria-label="Previous email"
                  title="Previous (←)"
                  onClick={() => go(previous)}
                  disabled={!previous}
                >
                  ‹
                </button>
                <span className="empty-note">{index >= 0 ? `${index + 1} of ${queue.length}` : ''}</span>
                <button
                  className="icon-btn"
                  aria-label="Next email"
                  title="Next (→)"
                  onClick={() => go(next)}
                  disabled={!next}
                >
                  ›
                </button>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}
            {!email && !error && <Loader label="Loading email…" />}

            {email && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">{email.subject || '(no subject)'}</span>
                </div>
                <div className="card-body">
                  <div className="detail-meta">
                    <div>
                      <span className="history-label">From</span>
                      <div>{email.sender_name || '—'}</div>
                      <div className="name-secondary">{email.sender_email || '—'}</div>
                    </div>
                    <div>
                      <span className="history-label">Received</span>
                      <div>{new Date(email.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="history-label">Why skipped</span>
                      <div>{REASON_LABELS[email.skip_reason] || email.skip_reason}</div>
                    </div>
                  </div>

                  <pre className="email-body">{email.body || 'No message text.'}</pre>

                  {actionError && <p className="form-error" style={{ marginTop: '12px' }}>{actionError}</p>}

                  {isPending && (
                    <div className="settings-actions">
                      <button className="btn btn-secondary" onClick={() => act('dismiss')} disabled={!!acting}>
                        {acting === 'dismiss' && <Spinner small />}Dismiss
                      </button>
                      <button className="btn btn-primary" onClick={() => act('convert')} disabled={!!acting}>
                        {acting === 'convert' && <Spinner small />}Make lead
                      </button>
                    </div>
                  )}

                  {email.status === 'converted' && email.lead_id && (
                    <p className="form-ok" style={{ marginTop: '12px' }}>
                      Made into a lead. <a href={`/leads/${email.lead_id}`}>Open lead</a>
                    </p>
                  )}
                  {email.status === 'dismissed' && (
                    <p className="empty-note" style={{ marginTop: '12px' }}>Dismissed.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
