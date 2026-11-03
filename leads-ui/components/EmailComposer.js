"use client";

import { useState } from "react";
import { Spinner } from '@/components/Loader';
import { isValidEmail, parseRecipients, MERGE_TAGS } from "@/lib/emailTemplates";

export default function EmailComposer({ lead, estimate, templates, onClose, onSent }) {
  const initial = templates.find((t) => t.is_default) || templates[0];

  const [templateId, setTemplateId] = useState(initial?.id ?? "");
  const [recipients, setRecipients] = useState(
    lead.sender_email && isValidEmail(lead.sender_email) ? [lead.sender_email] : []
  );
  const [recipientInput, setRecipientInput] = useState("");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  function addRecipients(text) {
    const parsed = parseRecipients(text);
    const invalid = parsed.find((a) => !isValidEmail(a));
    if (invalid) {
      setError(`"${invalid}" is not a valid email address`);
      return false;
    }
    setRecipients((prev) => [...new Set([...prev, ...parsed.map((a) => a.toLowerCase())])]);
    setRecipientInput("");
    setError(null);
    return true;
  }

  function handleRecipientKey(e) {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      if (recipientInput.trim()) addRecipients(recipientInput);
    } else if (e.key === "Backspace" && !recipientInput && recipients.length) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  }

  function handleTemplateChange(id) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  }

  function insertTag(tag) {
    setBody((prev) => `${prev}{{${tag}}}`);
  }

  async function handleSend() {
    // Pick up anything typed in the recipient box but not yet added.
    const pending = recipientInput.trim() ? parseRecipients(recipientInput) : [];
    const finalRecipients = [...recipients, ...pending];
    if (finalRecipients.length === 0) return setError("Add at least one recipient");
    const invalid = finalRecipients.find((a) => !isValidEmail(a));
    if (invalid) return setError(`"${invalid}" is not a valid email address`);
    if (!subject.trim()) return setError("Add a subject line");
    if (!body.trim()) return setError("Add the email body");

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/share/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId: estimate.id, to: finalRecipients, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      onSent(data.sentTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Email estimate v{estimate.version}</span>
          <button className="modal-close" onClick={onClose} disabled={sending}>✕</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="email_template">Template</label>
            <select id="email_template" value={templateId} onChange={(e) => handleTemplateChange(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (default)" : ""}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="email_to">To</label>
            <div className="recipient-box">
              {recipients.map((address) => (
                <span key={address} className="recipient-chip">
                  {address}
                  <button
                    type="button"
                    className="recipient-remove"
                    aria-label={`Remove ${address}`}
                    onClick={() => setRecipients((prev) => prev.filter((a) => a !== address))}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                id="email_to"
                className="recipient-input"
                type="text"
                placeholder={recipients.length ? "Add another address" : "name@example.com"}
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleRecipientKey}
                onBlur={() => recipientInput.trim() && addRecipients(recipientInput)}
              />
            </div>
            <p className="empty-note">Press Enter or comma to add. Separate several addresses with commas.</p>
          </div>

          <div className="field">
            <label htmlFor="email_subject">Subject</label>
            <input id="email_subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="email_body">Message</label>
            <textarea id="email_body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="merge-tags">
            <span className="empty-note">Insert:</span>
            {MERGE_TAGS.map((m) => (
              <button key={m.tag} type="button" className="merge-tag" onClick={() => insertTag(m.tag)} title={m.label}>
                {m.label}
              </button>
            ))}
          </div>

          <p className="empty-note" style={{ marginTop: "12px" }}>
            The estimate PDF (estimate-v{estimate.version}.pdf) is attached automatically. Tags are filled in when the email is sent.
          </p>

          {error && <p className="form-error" style={{ marginTop: "12px" }}>{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sending}>
              {sending && <Spinner small />}{sending ? "Sending…" : "Send email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
