// POST /api/share/email
// Body: { estimateId, to: string[], subject, body }
//
// Sends the estimate PDF from the workspace's own mail account to the recipients the
// user picked in the composer. Merge tags such as {{customer_name}} are filled in here.
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { getSettingsRow } from "@/lib/settingsServer";
import { explainSmtpError, isMailConfigured, sendMail } from "@/lib/mailer";
import { formatCurrency } from "@/lib/estimateUtils";
import { isValidEmail, renderTemplate } from "@/lib/emailTemplates";

const MAX_RECIPIENTS = 10;

export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { estimateId, to, subject, body } = await request.json();
  if (!estimateId) return NextResponse.json({ error: "estimateId is required" }, { status: 400 });

  const recipients = [...new Set((Array.isArray(to) ? to : []).map((a) => String(a).trim().toLowerCase()).filter(Boolean))];
  if (recipients.length === 0) return NextResponse.json({ error: "Add at least one recipient" }, { status: 400 });
  if (recipients.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `You can send to up to ${MAX_RECIPIENTS} recipients at once` }, { status: 400 });
  }
  const invalid = recipients.find((a) => !isValidEmail(a));
  if (invalid) return NextResponse.json({ error: `"${invalid}" is not a valid email address` }, { status: 400 });

  if (typeof subject !== "string" || !subject.trim()) return NextResponse.json({ error: "Add a subject line" }, { status: 400 });
  if (typeof body !== "string" || !body.trim()) return NextResponse.json({ error: "Add the email body" }, { status: 400 });

  const { data: estimate, error: estimateError } = await ctx.supabase
    .from("estimates")
    .select("*, leads(id, sender_name)")
    .eq("id", estimateId)
    .single();

  if (estimateError || !estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  if (!estimate.pdf_url) return NextResponse.json({ error: "Generate the PDF before emailing it" }, { status: 400 });

  const settings = await getSettingsRow(ctx.supabase, ctx.workspaceId);
  if (!isMailConfigured(settings)) {
    return NextResponse.json(
      { error: "Add your email (SMTP) details in Settings → Email first" },
      { status: 400 }
    );
  }

  const pdfRes = await fetch(estimate.pdf_url);
  if (!pdfRes.ok) return NextResponse.json({ error: "Could not load the PDF" }, { status: 502 });
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  const lead = estimate.leads;
  const vars = {
    customer_name: lead.sender_name || "there",
    business_name: settings.business_name || "our team",
    business_phone: settings.phone || "",
    estimate_version: String(estimate.version),
    estimate_total: formatCurrency(estimate.total),
  };

  try {
    await sendMail(settings, {
      to: recipients.join(", "),
      subject: renderTemplate(subject.trim(), vars),
      text: renderTemplate(body.trim(), vars),
      attachments: [{ filename: `estimate-v${estimate.version}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
    });
  } catch (err) {
    console.error("Estimate email failed:", err);
    return NextResponse.json({ error: `Email not sent. ${explainSmtpError(err.message)}` }, { status: 502 });
  }

  await ctx.supabase.from("estimate_shares").insert(
    recipients.map((recipient) => ({
      workspace_id: ctx.workspaceId,
      estimate_id: estimate.id,
      channel: "email",
      recipient,
    }))
  );
  await ctx.supabase.from("estimates").update({ status: "sent" }).eq("id", estimate.id);
  await ctx.supabase.from("leads").update({ status: "estimate_sent" }).eq("id", lead.id);

  return NextResponse.json({ success: true, sentTo: recipients });
}
