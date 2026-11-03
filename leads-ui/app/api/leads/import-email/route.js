// POST /api/leads/import-email
// Checks the workspace inbox and creates a lead for each recent email that matches the
// Lead rules in Settings. Emails already imported are skipped.
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { getSettingsRow } from "@/lib/settingsServer";
import { fetchRecentEmails, findEmailTimes, inboxSupported } from "@/lib/mailIntake";
import { matchesLeadRules, normalizeRuleList } from "@/lib/leadRules";

const MAX_BODY_LENGTH = 10000;

// Fills in the original sent time for email leads and skipped emails saved before it was captured.
// Returns how many were filled in.
async function backfillEmailTimes(ctx, settings) {
  const [{ data: leadRows }, { data: reviewRows }] = await Promise.all([
    ctx.supabase.from("leads").select("id, sender_email, overview, source_message_id")
      .eq("workspace_id", ctx.workspaceId).eq("source", "email").is("email_received_at", null),
    ctx.supabase.from("skipped_emails").select("id, sender_email, subject, source_message_id")
      .eq("workspace_id", ctx.workspaceId).is("received_at", null),
  ]);

  const lookups = [
    ...(leadRows || []).map((row) => ({ key: `lead:${row.id}`, messageId: row.source_message_id, fromEmail: row.sender_email, subject: row.overview })),
    ...(reviewRows || []).map((row) => ({ key: `review:${row.id}`, messageId: row.source_message_id, fromEmail: row.sender_email, subject: row.subject })),
  ];
  if (lookups.length === 0) return 0;

  const times = await findEmailTimes(settings, lookups);
  await Promise.all([...times].map(([key, receivedAt]) => {
    const [kind, id] = key.split(":");
    return kind === "lead"
      ? ctx.supabase.from("leads").update({ email_received_at: receivedAt }).eq("id", id)
      : ctx.supabase.from("skipped_emails").update({ received_at: receivedAt }).eq("id", id);
  }));
  return times.size;
}

export async function POST() {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const settings = await getSettingsRow(ctx.supabase, ctx.workspaceId);
  if (!inboxSupported(settings)) {
    return NextResponse.json(
      { error: "Lead import reads your inbox with your Email (SMTP) details. Set them up in Settings → Email with Gmail, Outlook or Yahoo first." },
      { status: 400 }
    );
  }

  const rules = {
    includeKeywords: normalizeRuleList(settings.lead_include_keywords),
    excludeKeywords: normalizeRuleList(settings.lead_exclude_keywords),
    blockedSenders: normalizeRuleList(settings.lead_blocked_senders),
  };

  let emails;
  try {
    emails = await fetchRecentEmails(settings);
  } catch (err) {
    console.error("Inbox read failed:", err);
    const message = /AUTHENTICATIONFAILED|Invalid credentials|Login failed|Invalid login/i.test(err.message)
      ? "Could not sign in to your inbox. Check the email and app password in Settings → Email."
      : `Could not read your inbox: ${err.message}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // An email is "seen" once it has either become a lead or landed in the review queue.
  const [{ data: leadRows, error: leadsError }, { data: reviewRows, error: reviewError }] = await Promise.all([
    ctx.supabase.from("leads").select("source_message_id").eq("workspace_id", ctx.workspaceId).not("source_message_id", "is", null),
    ctx.supabase.from("skipped_emails").select("source_message_id").eq("workspace_id", ctx.workspaceId),
  ]);
  if (leadsError || reviewError) {
    return NextResponse.json({ error: (leadsError || reviewError).message }, { status: 500 });
  }

  const alreadySeen = new Set([
    ...leadRows.map((row) => row.source_message_id),
    ...reviewRows.map((row) => row.source_message_id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const leads = [];
  const review = [];
  let duplicates = 0;

  for (const email of emails) {
    if (alreadySeen.has(email.messageId)) {
      duplicates += 1;
      continue;
    }
    const body = email.body.slice(0, MAX_BODY_LENGTH);
    const senderName = email.fromName || email.fromEmail.split("@")[0] || null;
    const senderEmail = email.fromEmail || null;
    const verdict = matchesLeadRules(email, rules);

    if (verdict.ok) {
      leads.push({
        workspace_id: ctx.workspaceId,
        source: "email",
        sender_name: senderName,
        sender_email: senderEmail,
        overview: email.subject || null,
        email_received_at: email.receivedAt,
        description: email.subject ? `${email.subject}\n\n${body}` : body,
        raw_email_body: body,
        source_message_id: email.messageId,
        status: "new",
        lead_date: today,
      });
    } else {
      review.push({
        workspace_id: ctx.workspaceId,
        source_message_id: email.messageId,
        sender_name: senderName,
        sender_email: senderEmail,
        subject: email.subject || null,
        received_at: email.receivedAt,
        body,
        skip_reason: verdict.reason,
        status: "pending",
      });
    }
  }

  if (leads.length > 0) {
    const { error: insertError } = await ctx.supabase.from("leads").insert(leads);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (review.length > 0) {
    const { error: reviewInsertError } = await ctx.supabase
      .from("skipped_emails")
      .insert(review);
    if (reviewInsertError) return NextResponse.json({ error: reviewInsertError.message }, { status: 500 });
  }

  let timesFilled = 0;
  try {
    timesFilled = await backfillEmailTimes(ctx, settings);
  } catch (err) {
    console.error("Email time backfill failed:", err);
  }

  return NextResponse.json({
    checked: emails.length,
    imported: leads.length,
    skipped: review.length,
    duplicates,
    timesFilled,
  });
}
