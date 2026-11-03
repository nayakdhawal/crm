"use client";

import { Spinner } from "@/components/Loader";
import { computeArea, computeLineTotal, formatCurrency, isAreaPricing, isRunningFoot } from "@/lib/estimateUtils";

export default function ServiceLineItems({ items, servicesMaster, onChange, onSave, dirty, saving, aiReady, onSuggest, suggesting, suggestNote }) {
  function update(id, patch) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function remove(id) {
    onChange(items.filter((item) => item.id !== id));
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    const first = servicesMaster.find((s) => s.active !== false);
    if (!first) return;
    onChange([
      ...items,
      { id: `local-${Date.now()}`, service_id: first.id, quantity: 1, length: 0, width: 0, notes: "" },
    ]);
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Requested services</span>
        <button className="link-btn" onClick={add} disabled={!servicesMaster.some((s) => s.active !== false)}>
          + Add service
        </button>
      </div>
      <div className="card-body">
        <div className="suggest-row">
          {aiReady ? (
            <button className="link-btn" onClick={onSuggest} disabled={suggesting}>
              {suggesting && <Spinner small />}{suggesting ? 'Reading the enquiry…' : 'Suggest from enquiry'}
            </button>
          ) : (
            <a className="link-btn" href="/settings">Add an AI key to suggest services</a>
          )}
        </div>
        {suggestNote && <p className="suggest-note">{suggestNote}</p>}
        {items.length > 0 && (
          <div className="service-head" aria-hidden="true">
            <span className="col-4">Service</span>
            <span className="col-2">Qty / Length</span>
            <span className="col-2">Width</span>
            <span className="col-2 head-right">Amount</span>
            <span className="col-2 head-right">Order</span>
          </div>
        )}
        {items.length === 0 ? (
          <p className="empty-note">
            {servicesMaster.length === 0
              ? "No services in the rate file yet."
              : "No services added yet."}
          </p>
        ) : (
          items.map((item, index) => {
            const service = servicesMaster.find((s) => s.id === item.service_id);
            const isArea = isAreaPricing(service?.pricing_type);
            const isRft = isRunningFoot(service?.pricing_type);
            const unit = service?.pricing_type === "per_sqft" ? "sqft" : "sqin";
            const choices = servicesMaster.filter((s) => s.active !== false || s.id === item.service_id);

            return (
              <div className="service-row" key={item.id}>
                <select
                  className="col-4"
                  value={item.service_id ?? ""}
                  onChange={(e) => update(item.id, { service_id: e.target.value })}
                >
                  {choices.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {isRft ? (
                  <>
                    <input
                      className="col-2"
                      type="number"
                      min="0"
                      placeholder="Length (ft)"
                      value={item.length ?? ""}
                      onChange={(e) => update(item.id, { length: parseFloat(e.target.value) || 0 })}
                    />
                    <div className="col-2" aria-hidden="true" />
                  </>
                ) : isArea ? (
                  <>
                    <input
                      className="col-2"
                      type="number"
                      min="0"
                      placeholder="Length"
                      value={item.length ?? ""}
                      onChange={(e) => update(item.id, { length: parseFloat(e.target.value) || 0 })}
                    />
                    <input
                      className="col-2"
                      type="number"
                      min="0"
                      placeholder="Width"
                      value={item.width ?? ""}
                      onChange={(e) => update(item.id, { width: parseFloat(e.target.value) || 0 })}
                    />
                  </>
                ) : (
                  <>
                    <input
                      className="col-2"
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={item.quantity ?? ""}
                      onChange={(e) => update(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                    <div className="col-2" aria-hidden="true" />
                  </>
                )}

                <div className="col-2 total-cell">
                  <div className="line-total">{formatCurrency(computeLineTotal(service, item))}</div>
                  {isArea && <div className="area-note">= {computeArea(item)} {unit}</div>}
                  {isRft && <div className="area-note">= {item.length || 0} rft</div>}
                </div>

                <div className="col-2 row-controls">
                  <button
                    className="row-btn"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="row-btn"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button className="remove-btn" onClick={() => remove(item.id)} aria-label="Remove service">
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}

        {dirty && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving && <Spinner small />}{saving ? "Saving…" : "Save services"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
