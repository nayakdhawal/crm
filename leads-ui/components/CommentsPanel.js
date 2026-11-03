"use client";

import { useState } from "react";
import { Spinner } from '@/components/Loader';

export default function CommentsPanel({ leadId, comments, onAdded }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd() {
    const text = draft.trim();
    if (!text) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add comment");
      onAdded(data.comment);
      setDraft("");
    } catch (err) {
      console.error(err);
      setError("Couldn't save the comment. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="activity-input-row">
      <textarea
        rows="2"
        placeholder="Add a comment…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      {error && <p className="empty-note" style={{ color: "#b91c1c", marginBottom: "8px" }}>{error}</p>}
      <div className="activity-submit-row">
        <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !draft.trim()}>
          {saving && <Spinner small />}{saving ? "Saving…" : "Comment"}
        </button>
      </div>
    </div>
  );
}
