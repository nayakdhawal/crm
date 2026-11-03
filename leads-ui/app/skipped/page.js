'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import { Spinner, SkeletonRows } from '@/components/Loader';
import { usePagination } from '@/components/Pagination';
import DataTable from '@/components/DataTable';
import { REASON_LABELS } from '@/lib/leadRules';

const TABS = [
  { key: 'pending', label: 'To review' },
  { key: 'converted', label: 'Made leads' },
  { key: 'dismissed', label: 'Dismissed' },
];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function SkippedEmailsPage() {
  const [status, setStatus] = useState('pending');
  const [emails, setEmails] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const router = useRouter();
  const pager = usePagination(emails || [], { resetKey: status });
  const [message, setMessage] = useState(null);

  const load = useCallback(async (nextStatus) => {
    setEmails(null);
    setLoadError(null);
    try {
      const res = await fetch(`/api/skipped-emails?status=${nextStatus}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load skipped emails');
      setEmails(data.emails);
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  async function act(email, action) {
    setBusyId(email.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/skipped-emails/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setEmails((prev) => prev.filter((e) => e.id !== email.id));
      setMessage({
        type: 'ok',
        text: action === 'convert' ? `Lead created for ${email.sender_name || email.sender_email || 'this email'}.` : 'Email dismissed.',
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app">
      <AppSidebar active="skipped" />

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">Skipped emails</div>
        </header>
        <main className="content">
          <section className="view-pad">
            <p className="empty-note" style={{ marginBottom: '16px' }}>
              These emails didn't match your Lead rules, so they weren't added as leads. Review them here and make
              any that are real enquiries into leads.
            </p>

            <div className="tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={status === t.key}
                  className={`tab${status === t.key ? ' active' : ''}`}
                  onClick={() => setStatus(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {message && (
              <p className={message.type === 'ok' ? 'form-ok' : 'form-error'} style={{ marginBottom: '12px' }}>
                {message.text}
              </p>
            )}
            {loadError && <p className="form-error">{loadError}</p>}

            <DataTable
              pager={pager}
              noun="emails"
              footer="Inbox checks cover the last 14 days, up to 100 emails."
            >
              <table>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Why skipped</th>
                    <th>Received</th>
                    <th>{status === 'pending' ? 'Actions' : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {!emails && !loadError && <SkeletonRows rows={4} cols={5} />}
                  {emails && emails.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-faint)', fontSize: '14px' }}>
                        {status === 'pending' ? 'Nothing to review.' : 'No emails here yet.'}
                      </td>
                    </tr>
                  )}
                  {emails && pager.pageItems.map((email) => (
                    <SkippedRow
                      key={email.id}
                      email={email}
                      status={status}
                      busy={busyId === email.id}
                      onOpen={() => router.push(`/skipped/${email.id}?status=${status}`)}
                      onAct={(action) => act(email, action)}
                    />
                  ))}
                </tbody>
              </table>
            </DataTable>
          </section>
        </main>
      </div>
    </div>
  );
}


function SkippedRow({ email, status, busy, onOpen, onAct }) {
  return (
    <tr onClick={onOpen} style={{ cursor: "pointer" }}>
      <td>
        <div className="name-primary">{email.sender_name || "—"}</div>
        <div className="name-secondary">{email.sender_email}</div>
      </td>
      <td>{email.subject || <span className="muted-cell">(no subject)</span>}</td>
      <td className="muted-cell">{REASON_LABELS[email.skip_reason] || email.skip_reason}</td>
      <td className="muted-cell">{formatDate(email.created_at)}</td>
      <td onClick={(e) => e.stopPropagation()}>
        {status === "pending" && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="link-btn" onClick={() => onAct("convert")} disabled={busy}>
              {busy && <Spinner small />}Make lead
            </button>
            <button className="link-btn" onClick={() => onAct("dismiss")} disabled={busy}>Dismiss</button>
          </div>
        )}
      </td>
    </tr>
  );
}
