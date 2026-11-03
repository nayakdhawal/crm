'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ServiceLineItems from '@/components/ServiceLineItems';
import EstimatePanel from '@/components/EstimatePanel';
import CommentsPanel from '@/components/CommentsPanel';
import AppSidebar from '@/components/AppSidebar';
import { withLineTotals } from '@/lib/estimateUtils';

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

const LEAD_SOURCES = ['Referral', 'Website', 'Social Media', 'Walk-in', 'Advertisement', 'Cold Call', 'Other'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

function avatarColor(name) {
  const sum = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function toLineItem(row) {
  return {
    id: row.id,
    service_id: row.service_id,
    quantity: row.quantity,
    length: row.length,
    width: row.width,
    notes: row.notes || '',
  };
}

function itemsKey(items) {
  return JSON.stringify(items.map(({ service_id, quantity, length, width, notes }) => ({
    service_id, quantity, length, width, notes,
  })));
}

async function patchLead(leadId, body) {
  const res = await fetch(`/api/leads/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to save');
}

// stacked puts the label above the control, for fields that need the full card width.
function PropRow({ label, stacked = false, children }) {
  return (
    <div className={`prop-row${stacked ? ' stacked' : ''}`}>
      <span className="prop-label">{label}</span>
      <div className="prop-field">{children}</div>
    </div>
  );
}

// A property that turns into an input when clicked and saves when it loses focus.
function EditableProp({ label, value, display, type = 'text', onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  function commit() {
    setEditing(false);
    if (String(draft) !== String(value ?? '')) onSave(draft);
  }

  return (
    <PropRow label={label}>
      {editing ? (
        <input
          type={type}
          className="prop-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      ) : (
        <button
          type="button"
          className={`prop-text${display ? '' : ' empty'}`}
          onClick={() => { setDraft(value ?? ''); setEditing(true); }}
        >
          {display || 'Add'}
        </button>
      )}
    </PropRow>
  );
}

export default function LeadDetailClient({ lead, servicesMaster, initialLeadServices, initialComments, initialEstimates, aiReady }) {
  const router = useRouter();
  const avatar = avatarColor(lead.sender_name);

  const [status, setStatus] = useState(lead.status);
  const [callbackDate, setCallbackDate] = useState(lead.callback_date ? lead.callback_date.slice(0, 10) : '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [location, setLocation] = useState(lead.location || '');
  const [score, setScore] = useState(lead.opportunity_score ?? '');
  const [leadOrigin, setLeadOrigin] = useState(lead.lead_origin || '');
  const [leadDate, setLeadDate] = useState(lead.lead_date || '');
  const [leadValue, setLeadValue] = useState(lead.lead_value ?? '');
  const [currency, setCurrency] = useState(lead.currency || 'INR');
  const [description, setDescription] = useState(lead.description || '');
  const [savedDescription, setSavedDescription] = useState(lead.description || '');

  const initialItems = withLineTotals(initialLeadServices.map(toLineItem), servicesMaster);
  const [items, setItems] = useState(initialItems);
  const [savedItemsKey, setSavedItemsKey] = useState(itemsKey(initialItems));
  const [savingServices, setSavingServices] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState(null);

  const dirtyServices = itemsKey(items) !== savedItemsKey;

  async function handleSuggest() {
    setSuggesting(true);
    setSuggestNote(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/extract-services`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not get suggestions');

      if (data.items.length === 0) {
        setSuggestNote('No matching services found in the enquiry.');
        return;
      }
      const added = data.items.map((s, i) => ({
        id: `suggested-${Date.now()}-${i}`,
        service_id: s.service_id,
        quantity: s.quantity,
        length: s.length ?? 0,
        width: s.width ?? 0,
        notes: s.reason || '',
      }));
      setItems(withLineTotals([...items, ...added], servicesMaster));
      setSuggestNote(`Added ${added.length} suggested service${added.length === 1 ? '' : 's'}. Check the quantities, then save.`);
    } catch (e) {
      console.error(e);
      setSuggestNote(`Couldn't get suggestions: ${e.message}`);
    } finally {
      setSuggesting(false);
    }
  }
  const s = STATUS_STYLES[status];

  async function save(body, onError) {
    try {
      await patchLead(lead.id, body);
    } catch (e) {
      console.error(e);
      onError?.();
    }
  }

  function handleStatusChange(newStatus) {
    const previous = status;
    setStatus(newStatus);
    save({ status: newStatus }, () => setStatus(previous));
  }

  function handleCallbackChange(newDate) {
    const previous = callbackDate;
    setCallbackDate(newDate);
    save({ callback_date: newDate || null }, () => setCallbackDate(previous));
  }

  function handleDescriptionBlur() {
    if (description === savedDescription) return;
    const previous = savedDescription;
    setSavedDescription(description);
    save({ description: description || null }, () => {
      setDescription(previous);
      setSavedDescription(previous);
    });
  }

  function handleLeadValueBlur() {
    const amount = leadValue === '' ? null : Number(leadValue);
    save({ lead_value: amount, currency });
  }

  async function handleSaveServices() {
    setSavingServices(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/services`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(({ service_id, quantity, length, width, notes }) => ({
          service_id, quantity, length, width, notes,
        })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save services');

      const saved = withLineTotals(data.items.map(toLineItem), servicesMaster);
      setItems(saved);
      setSavedItemsKey(itemsKey(saved));
    } catch (e) {
      console.error(e);
      alert(`Couldn't save services: ${e.message}`);
    } finally {
      setSavingServices(false);
    }
  }

  return (
    <div className="app">
      <AppSidebar active="leads" />

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <button className="breadcrumb-link" onClick={() => router.push('/leads')}>Leads</button>
            <span className="breadcrumb-sep">/</span>
            <span>{lead.sender_name}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: s.bg, color: s.text, fontSize: '12.5px', fontWeight: 500 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: s.dot }} />
            {s.label}
          </div>
        </header>

        <main className="content">
          <section className="view-pad">
            <div className="detail-header">
              <div className="avatar" style={{ width: '40px', height: '40px', background: avatar.bg, color: avatar.text, fontSize: '16px' }}>
                {initials(lead.sender_name)}
              </div>
              <div>
                <div className="detail-name">{lead.sender_name}</div>
                <div className="detail-email">{lead.sender_email}</div>
              </div>
            </div>

            <div className="layout">
              <div className="col">
                {lead.raw_email_body && (
                  <div className="card">
                    <div className="card-header"><span className="card-title">Original message</span></div>
                    <div className="card-body"><p className="message-text">{lead.raw_email_body}</p></div>
                  </div>
                )}

                <div className="card">
                  <div className="card-header"><span className="card-title">Description</span></div>
                  <div className="card-body">
                    <textarea
                      className="desc-textarea"
                      rows="4"
                      placeholder="What does this lead need?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={handleDescriptionBlur}
                    />
                  </div>
                </div>

                <ServiceLineItems
                  items={items}
                  servicesMaster={servicesMaster}
                  onChange={(next) => setItems(withLineTotals(next, servicesMaster))}
                  onSave={handleSaveServices}
                  dirty={dirtyServices}
                  saving={savingServices}
                  aiReady={aiReady}
                  onSuggest={handleSuggest}
                  suggesting={suggesting}
                  suggestNote={suggestNote}
                />

                <EstimatePanel
                  lead={lead}
                  lineItems={items}
                  existingEstimates={initialEstimates}
                  dirty={dirtyServices}
                />
              </div>

              <div className="col">
                <div className="card">
                  <div className="card-header"><span className="card-title">Properties</span></div>
                  <div className="card-body prop-body">
                    <div className="prop-group">
                      <PropRow label="Status">
                        <select className="prop-input" value={status} onChange={(e) => handleStatusChange(e.target.value)}>
                          {Object.entries(STATUS_STYLES).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </PropRow>
                      <PropRow label="Callback">
                        <input type="date" className="prop-input" value={callbackDate} onChange={(e) => handleCallbackChange(e.target.value)} />
                      </PropRow>
                      <PropRow label="Lead source">
                        <select
                          className="prop-input"
                          value={leadOrigin}
                          onChange={(e) => { setLeadOrigin(e.target.value); save({ lead_origin: e.target.value || null }); }}
                        >
                          <option value="">Not set</option>
                          {LEAD_SOURCES.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </PropRow>
                    </div>

                    <div className="prop-group">
                      <EditableProp
                        label="Phone"
                        value={phone}
                        display={phone}
                        type="tel"
                        onSave={(v) => { setPhone(v); save({ phone: v || null }); }}
                      />
                      <EditableProp
                        label="Location"
                        value={location}
                        display={location}
                        onSave={(v) => { setLocation(v); save({ location: v || null }); }}
                      />
                    </div>

                    <div className="prop-group">
                      <PropRow label="Lead date">
                        <input
                          type="date"
                          className="prop-input"
                          value={leadDate}
                          onChange={(e) => { setLeadDate(e.target.value); save({ lead_date: e.target.value || null }); }}
                        />
                      </PropRow>
                      <EditableProp
                        label="Score"
                        value={score}
                        display={score}
                        type="number"
                        onSave={(v) => {
                          const n = v === '' ? null : Number(v);
                          setScore(n ?? '');
                          save({ opportunity_score: n });
                        }}
                      />
                      <PropRow label="Lead value" stacked>
                        <div className="prop-money">
                          <select
                            className="prop-input"
                            value={currency}
                            onChange={(e) => { setCurrency(e.target.value); save({ lead_value: leadValue === '' ? null : Number(leadValue), currency: e.target.value }); }}
                          >
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input
                            type="number"
                            className="prop-input"
                            placeholder="Add value"
                            value={leadValue}
                            onChange={(e) => setLeadValue(e.target.value)}
                            onBlur={handleLeadValueBlur}
                          />
                        </div>
                      </PropRow>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><span className="card-title">Activity</span></div>
                  <div className="card-body">
                    <CommentsPanel
                      leadId={lead.id}
                      onAdded={(c) => setComments((prev) => [c, ...prev])}
                    />
                    <ul className="activity-list">
                      {comments.map((c) => (
                        <li key={c.id} className="activity-item">
                          <div className="activity-icon">💬</div>
                          <div>
                            <p className="activity-text">{c.comment_text}</p>
                            <p className="activity-time">{new Date(c.created_at).toLocaleString()}</p>
                          </div>
                        </li>
                      ))}
                      <li className="activity-item">
                        <div className="activity-icon">🚩</div>
                        <div>
                          <p className="activity-text">Lead created</p>
                          <p className="activity-time">{new Date(lead.created_at).toLocaleString()}</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
