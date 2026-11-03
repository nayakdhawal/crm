'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/estimateUtils';
import { usePagination } from '@/components/Pagination';
import DataTable from '@/components/DataTable';

const PRICING_OPTIONS = [
  { value: 'flat', label: 'Flat (per item)' },
  { value: 'per_sqft', label: 'Per sq ft' },
  { value: 'per_sqinch', label: 'Per sq inch' },
  { value: 'per_rft', label: 'Per running foot (R.F.T.)' },
];

const EMPTY = { name: '', category: '', pricing_type: 'flat', rate: '', unit_label: '' };

function toForm(service) {
  return {
    name: service.name ?? '',
    category: service.category ?? '',
    pricing_type: service.pricing_type ?? 'flat',
    rate: service.rate ?? '',
    unit_label: service.unit_label ?? '',
  };
}

function ServiceFields({ form, setForm }) {
  return (
    <div className="service-form-grid">
      <input placeholder="Service name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <select value={form.pricing_type} onChange={(e) => setForm({ ...form, pricing_type: e.target.value })}>
        {PRICING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input type="number" min="0" step="0.01" placeholder="Rate" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
      <input placeholder="Unit label (e.g. per piece)" value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} />
    </div>
  );
}

export default function ServicesSection({ services, onChange }) {
  const [newService, setNewService] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const pager = usePagination(services);
  const [editForm, setEditForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState(null);

  async function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreviewing(true);
    setImportMessage(null);
    setPreview(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/services/import/preview', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read the file');
      setPreview(data.items);
    } catch (err) {
      setImportMessage({ type: 'error', text: err.message });
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!window.confirm(`Replace your current services with these ${preview.length} items? Existing estimates keep their rates.`)) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await fetch('/api/services/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const listRes = await fetch('/api/services');
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error || 'Imported, but the list could not be refreshed');
      onChange(listData.services);
      setPreview(null);
      setImportMessage({ type: 'ok', text: `Imported ${data.imported} items. ${data.archived} previous services archived.` });
    } catch (err) {
      setImportMessage({ type: 'error', text: err.message });
    } finally {
      setImporting(false);
    }
  }

  async function request(url, options) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function handleAdd(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await request('/api/services', { method: 'POST', body: JSON.stringify(newService) });
      onChange([...services, data.service].sort((a, b) => a.name.localeCompare(b.name)));
      setNewService(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(id) {
    setBusy(true);
    setError(null);
    try {
      const data = await request(`/api/services/${id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
      onChange(services.map((s) => (s.id === id ? data.service : s)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(service) {
    if (!window.confirm(`Delete "${service.name}" from the rate table?`)) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/api/services/${service.id}`, { method: 'DELETE' });
      onChange(services.filter((s) => s.id !== service.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-stack">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Import rate card (Excel)</span>
          <label className="link-btn">
            {previewing ? 'Reading file…' : 'Choose .xlsx file'}
            <input type="file" accept=".xlsx" onChange={handleFileChosen} disabled={previewing || importing} hidden />
          </label>
        </div>
        <div className="card-body">
          {!preview && (
            <p className="empty-note">
              Upload your rate card to replace the services below. You'll see a preview before anything is saved.
            </p>
          )}

          {preview && (
            <>
              <p className="empty-note" style={{ marginBottom: '12px' }}>
                {preview.length} items found in {new Set(preview.map((p) => p.section)).size} sections. Check the list, then import.
              </p>
              <div className="table-card import-preview">
                <table>
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Item</th>
                      <th>Unit</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} style={{ cursor: 'default' }}>
                        <td className="muted-cell">{p.section}</td>
                        <td>{p.name}</td>
                        <td className="muted-cell">{p.unit}</td>
                        <td>{formatCurrency(p.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="settings-actions">
                <button className="btn btn-secondary" onClick={() => setPreview(null)} disabled={importing}>Cancel</button>
                <button className="btn btn-primary" onClick={handleConfirmImport} disabled={importing}>
                  {importing ? 'Importing…' : `Replace with ${preview.length} items`}
                </button>
              </div>
            </>
          )}

          {importMessage && (
            <p className={importMessage.type === 'ok' ? 'form-ok' : 'form-error'} style={{ marginTop: '12px' }}>
              {importMessage.text}
            </p>
          )}
        </div>
      </div>

      <form className="card" onSubmit={handleAdd}>
        <div className="card-header">
          <span className="card-title">Add a service</span>
        </div>
        <div className="card-body">
          <ServiceFields form={newService} setForm={setNewService} />
          <div className="settings-actions">
            {error && <span className="form-error">{error}</span>}
            <button type="submit" className="btn btn-primary" disabled={busy || !newService.name.trim() || newService.rate === ''}>
              Add service
            </button>
          </div>
        </div>
      </form>

      <DataTable pager={pager} noun="services">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Pricing</th>
              <th>Rate</th>
              <th>Unit</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: '32px' }}>
                  No services yet. Add your first one above.
                </td>
              </tr>
            )}
            {pager.pageItems.map((s) => (
              <tr key={s.id} style={{ cursor: 'default' }}>
                {editingId === s.id ? (
                  <td colSpan="5">
                    <ServiceFields form={editForm} setForm={setEditForm} />
                    <div className="settings-actions">
                      <button className="btn btn-secondary" onClick={() => setEditingId(null)} disabled={busy}>Cancel</button>
                      <button className="btn btn-primary" onClick={() => handleSaveEdit(s.id)} disabled={busy}>Save</button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td>
                      <div className="name-primary">{s.name}</div>
                      {s.category && <div className="name-secondary">{s.category}</div>}
                    </td>
                    <td className="muted-cell">{PRICING_OPTIONS.find((o) => o.value === s.pricing_type)?.label}</td>
                    <td>{formatCurrency(s.rate)}</td>
                    <td className="muted-cell">{s.unit_label || '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="link-btn" onClick={() => { setEditForm(toForm(s)); setEditingId(s.id); }} disabled={busy}>Edit</button>
                      {' '}
                      <button className="link-btn danger-link" onClick={() => handleDelete(s)} disabled={busy}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
