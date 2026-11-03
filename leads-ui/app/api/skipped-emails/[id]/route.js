// PATCH /api/skipped-emails/[id]
// Body: { action: "convert" | "dismiss" }
//   convert → creates a lead from the email and marks it converted
//   dismiss → hides it from the review queue
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

const MAX_BODY_LENGTH = 10000;

export async function GET(request, props) {
  const { id } = await props.params;
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("skipped_emails")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .single();
  if (error || !data) return NextResponse.json({ error: "Email not found" }, { status: 404 });

  return NextResponse.json({ email: data });
}

export async function PATCH(request, props) {
  const { id } = await props.params;
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { action } = await request.json();
  if (action !== "convert" && action !== "dismiss") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data: email, error: fetchError } = await ctx.supabase
    .from("skipped_emails")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .single();
  if (fetchError || !email) return NextResponse.json({ error: "Email not found" }, { status: 404 });
  if (email.status !== "pending") {
    return NextResponse.json({ error: "This email has already been reviewed" }, { status: 409 });
  }

  if (action === "dismiss") {
    const { error } = await ctx.supabase
      .from("skipped_emails")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const body = (email.body || "").slice(0, MAX_BODY_LENGTH);
  const { data: lead, error: leadError } = await ctx.supabase
    .from("leads")
    .insert({
      workspace_id: ctx.workspaceId,
      source: "email",
      sender_name: email.sender_name,
      sender_email: email.sender_email,
      overview: email.subject || null,
      email_received_at: email.received_at,
      description: email.subject ? `${email.subject}\n\n${body}` : body,
      raw_email_body: body,
      source_message_id: email.source_message_id,
      status: "new",
      lead_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });

  const { error: updateError } = await ctx.supabase
    .from("skipped_emails")
    .update({ status: "converted", lead_id: lead.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ lead }, { status: 201 });
}
