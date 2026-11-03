'use client';

import { useEffect, useState } from 'react';
import { Spinner, SkeletonRows } from '@/components/Loader';
import { usePagination } from '@/components/Pagination';
import DataTable from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';

const STATUS_GROUPS = {
  open: ['new', 'contacted', 'estimate_previewed', 'estimate_sent', 'follow_up'],
  won: ['won'],
  lost: ['lost'],
};

const STATUS_GROUP_BY_KEY = Object.fromEntries(
  Object.entries(STATUS_GROUPS).flatMap(([group, keys]) => keys.map((k) => [k, group]))
);

const GROUP_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [filter, setFilter] = useState('');
  const [group, setGroup] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [checkingInbox, setCheckingInbox] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [openingLeadId, setOpeningLeadId] = useState(null);
  const router = useRouter();
  const [formData, setFormData] = useState({
    sender_name: '',
    sender_email: '',
    phone: '',
    location: '',
    description: '',
    status: 'new',
    lead_date: new Date().toISOString().split('T')[0],
    opportunity_score: '',
    lead_value: '',
    currency: 'INR',
    lead_origin: '',
  });

  const STATUS_STYLES = {
    new: { bg: '#F1F2F4', text: '#52565C', dot: '#9CA3AF', label: 'New' },
    contacted: { bg: '#EAF0FF', text: '#2A5CFF', dot: '#2A5CFF', label: 'Contacted' },
    estimate_previewed: { bg: '#FFF6E5', text: '#B45B0A', dot: '#F59E0B', label: 'Estimate Previewed' },
    estimate_sent: { bg: '#F1EEFF', text: '#6D48D9', dot: '#8B5CF6', label: 'Estimate Sent' },
    follow_up: { bg: '#FFEFE6', text: '#C2410C', dot: '#FB923C', label: 'Follow-up' },
    won: { bg: '#E9F9EE', text: '#15803D', dot: '#22C55E', label: 'Won' },
    lost: { bg: '#FDEEEE', text: '#B91C1C', dot: '#EF4444', label: 'Lost' },
  };

  const AVATAR_PALETTE = [
    { bg: '#EAF0FF', text: '#2A5CFF' }, { bg: '#F1EEFF', text: '#6D48D9' },
    { bg: '#E9F9EE', text: '#15803D' }, { bg: '#FFF6E5', text: '#B45B0A' },
    { bg: '#FFEFE6', text: '#C2410C' }, { bg: '#FDEEEE', text: '#B91C1C' },
  ];

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/leads');
      if (res.status === 409) {
        router.push('/onboarding');
        return;
      }
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load leads', 'error');
    } finally {
      setLoadingLeads(false);
    }
  };

  const showToast = (msg, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const getAvatarColor = (name) => {
    const sum = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
  };

  const getInitials = (name) => {
    const parts = (name || '?').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  };

  const openLead = (id) => {
    setOpeningLeadId(id);
    router.push(`/leads/${id}`);
  };

  const handleCheckInbox = async () => {
    setCheckingInbox(true);
    try {
      const res = await fetch('/api/leads/import-email', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Inbox check failed');
      const reviewNote = data.skipped ? `, ${data.skipped} skipped for review` : '';
      showToast(
        data.imported
          ? `${data.imported} new lead${data.imported === 1 ? '' : 's'} imported${reviewNote}`
          : `No new leads. Checked ${data.checked} email${data.checked === 1 ? '' : 's'}${reviewNote}.`,
        'success'
      );
      if (data.imported) await fetchLeads();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setCheckingInbox(false);
    }
  };

  const groupOf = (status) => STATUS_GROUP_BY_KEY[status] || 'open';
  const groupCounts = leads.reduce((acc, l) => {
    acc.all += 1;
    acc[groupOf(l.status)] += 1;
    return acc;
  }, { all: 0, open: 0, won: 0, lost: 0 });

  const query = filter.trim().toLowerCase();
  const matchesQuery = (lead) =>
    !query ||
    [lead.sender_name, lead.sender_email, lead.description, lead.raw_email_body]
      .some((field) => field?.toLowerCase().includes(query));

  const filtered = leads.filter(l =>
    (group === 'all' || groupOf(l.status) === group) && matchesQuery(l)
  );

  const pager = usePagination(filtered, { resetKey: `${group}|${query}` });

  return (
    <div className="app">
      <AppSidebar active="leads" />

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">Leads</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={handleCheckInbox} disabled={checkingInbox}>
              {checkingInbox && <Spinner small />}{checkingInbox ? 'Checking…' : 'Check inbox'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add lead</button>
          </div>
        </header>
        <main className="content">
          <section className="view-pad">
            <div className="tabs" role="tablist">
              {GROUP_TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={group === t.key}
                  className={`tab${group === t.key ? ' active' : ''}`}
                  onClick={() => setGroup(t.key)}
                >
                  {t.label} <span className="tab-count">{groupCounts[t.key]}</span>
                </button>
              ))}
            </div>
            <input type="text" className="search-input" placeholder="Search by name, email or words in the message" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <DataTable pager={pager} noun="leads">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Overview</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Callback</th>
                    <th>Email time</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLeads ? (
                    <SkeletonRows rows={5} cols={6} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-faint)', fontSize: '14px' }}>
                        {filter || group !== 'all' ? 'No leads match these filters.' : 'No leads yet.'}
                      </td>
                    </tr>
                  ) : (
                    pager.pageItems.map(lead => {
                      const s = STATUS_STYLES[lead.status];
                      const avatar = getAvatarColor(lead.sender_name);
                      return (
                        <tr key={lead.id} onClick={() => openLead(lead.id)} className={openingLeadId === lead.id ? 'row-opening' : undefined}>
                          <td>
                            <div className="name-cell">
                              {openingLeadId === lead.id && <Spinner small />}
                              <div className="avatar" style={{ width: '28px', height: '28px', background: avatar.bg, color: avatar.text, fontSize: '12px' }}>
                                {getInitials(lead.sender_name)}
                              </div>
                              <div>
                                <div className="name-primary">{lead.sender_name}</div>
                                <div className="name-secondary">{lead.sender_email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="muted-cell" style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.overview || undefined}>
                            {lead.overview || '—'}
                          </td>
                          <td className="muted-cell capitalize">{lead.source}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select className="status-select" style={{ backgroundColor: s.bg, color: s.text }} value={lead.status} onChange={(e) => {
                              setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: e.target.value } : l));
                              showToast('Status updated', 'success');
                            }}>
                              {Object.entries(STATUS_STYLES).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="muted-cell">{lead.callback_date ? new Date(lead.callback_date).toLocaleDateString() : '—'}</td>
                          <td className="muted-cell" style={{ whiteSpace: 'nowrap' }}>
                            {lead.email_received_at ? new Date(lead.email_received_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </DataTable>
          </section>
        </main>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add lead</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Name</label>
                <input type="text" value={formData.sender_name} onChange={(e) => setFormData({...formData, sender_name: e.target.value})} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={formData.sender_email} onChange={(e) => setFormData({...formData, sender_email: e.target.value})} />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="field">
                <label>Location</label>
                <input type="text" placeholder="Area, city" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows="3" placeholder="What does this lead need?" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Lead date</label>
                  <input type="date" value={formData.lead_date} onChange={(e) => setFormData({...formData, lead_date: e.target.value})} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Opportunity score (0-100)</label>
                  <input type="number" min="0" max="100" value={formData.opportunity_score} onChange={(e) => setFormData({...formData, opportunity_score: e.target.value})} />
                </div>
                <div className="field">
                  <label>Lead source</label>
                  <select value={formData.lead_origin} onChange={(e) => setFormData({...formData, lead_origin: e.target.value})}>
                    <option value="">—</option>
                    {['Referral', 'Website', 'Social Media', 'Walk-in', 'Advertisement', 'Cold Call', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Lead value</label>
                <div className="field-row-money">
                  <select className="money-currency" value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})}>
                    {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="money-amount" type="number" min="0" placeholder="Expected deal size" value={formData.lead_value} onChange={(e) => setFormData({...formData, lead_value: e.target.value})} />
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={async () => {
                  if (!formData.sender_name.trim()) { alert('Please enter a name'); return; }
                  const res = await fetch('/api/leads', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({...formData, opportunity_score: formData.opportunity_score ? Number(formData.opportunity_score) : null, lead_value: formData.lead_value ? Number(formData.lead_value) : null, source: 'manual'})
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setLeads(prev => [data.lead, ...prev]);
                    setShowModal(false);
                    setFormData({sender_name: '', sender_email: '', phone: '', location: '', description: '', status: 'new', lead_date: new Date().toISOString().split('T')[0], opportunity_score: '', lead_value: '', currency: 'INR', lead_origin: ''});
                    showToast('Lead added', 'success');
                  } else showToast('Failed to add lead', 'error');
                }}>Add lead</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="toast-root">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}
