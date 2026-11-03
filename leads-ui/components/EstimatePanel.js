"use client";

import { useState } from "react";
import { Spinner } from '@/components/Loader';
import { computeEstimateTotals, formatCurrency } from "@/lib/estimateUtils";
import EmailComposer from "@/components/EmailComposer";

export default function EstimatePanel({ lead, lineItems, existingEstimates = [], dirty }) {
  const [estimates, setEstimates] = useState(existingEstimates);
  const [generating, setGenerating] = useState(false);
  const [composing, setComposing] = useState(null);
  const [templates, setTemplates] = useState(null);
  const [openingComposer, setOpeningComposer] = useState(false);

  const { subtotal, tax, total } = computeEstimateTotals(lineItems);
  const nextVersion = (estimates[0]?.version || 0) + 1;
  const canGenerate = !generating && !dirty && lineItems.length > 0;

  async function handleGeneratePdf() {
    setGenerating(true);
    try {
      const createRes = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, lineItems }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create estimate");

      const pdfRes = await fetch(`/api/estimates/${createData.estimate.id}/pdf`, { method: "POST" });
      const pdfData = await pdfRes.json();
      if (!pdfRes.ok) throw new Error(pdfData.error || "Failed to render PDF");

      setEstimates((prev) => [
        { ...createData.estimate, pdf_url: pdfData.pdf_url },
        ...prev.map((e) => ({ ...e, status: "superseded" })),
      ]);
    } catch (err) {
      console.error(err);
      alert(`Couldn't generate the estimate: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleWhatsapp(estimate) {
    const message = encodeURIComponent(
      `Hi ${lead.sender_name}, here's your estimate (v${estimate.version}): ${estimate.pdf_url}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");

    try {
      await fetch("/api/share/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId: estimate.id, channel: "whatsapp", recipient: lead.sender_email }),
      });
    } catch (err) {
      console.error("Failed to log WhatsApp share", err);
    }
  }

  async function openComposer(estimate) {
    setOpeningComposer(true);
    try {
      if (!templates) {
        const res = await fetch("/api/email-templates");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load email templates");
        setTemplates(data.templates);
      }
      setComposing(estimate);
    } catch (err) {
      alert(`Couldn't open the email: ${err.message}`);
    } finally {
      setOpeningComposer(false);
    }
  }

  function handleSent(estimate, recipients) {
    setEstimates((prev) => prev.map((e) => (e.id === estimate.id ? { ...e, status: "sent" } : e)));
    setComposing(null);
    alert(`Estimate v${estimate.version} emailed to ${recipients.join(", ")}`);
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Estimate</span>
      </div>
      <div className="card-body">
        <div className="totals">
          <div className="totals-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="totals-row"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
          <div className="totals-row bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
        </div>

        {dirty && <p className="empty-note" style={{ marginBottom: "12px" }}>Save the services before generating an estimate.</p>}

        <button className="btn btn-primary btn-block" onClick={handleGeneratePdf} disabled={!canGenerate}>
          {generating && <Spinner small />}{generating ? "Generating…" : `Generate PDF (v${nextVersion})`}
        </button>

        {estimates.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <p className="history-label">History</p>
            {estimates.map((est) => (
              <div key={est.id} className="history-item">
                <div>
                  <div className="history-version">v{est.version} · {formatCurrency(est.total)}</div>
                  <div className="history-status">{est.status}</div>
                </div>
                <div className="history-actions">
                  {est.pdf_url && (
                    <a className="link-btn" href={est.pdf_url} target="_blank" rel="noreferrer">View</a>
                  )}
                  <button className="link-btn" onClick={() => openComposer(est)} disabled={!est.pdf_url || openingComposer}>
                    Email
                  </button>
                  <button className="link-btn" onClick={() => handleWhatsapp(est)} disabled={!est.pdf_url}>
                    WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {composing && (
        <EmailComposer
          lead={lead}
          estimate={composing}
          templates={templates}
          onClose={() => setComposing(null)}
          onSent={(recipients) => handleSent(composing, recipients)}
        />
      )}
    </div>
  );
}
