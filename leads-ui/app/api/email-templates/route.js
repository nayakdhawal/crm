// GET  /api/email-templates  → the workspace's templates (seeds the standard one on first use)
// POST /api/email-templates  → create a template
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATE } from "@/lib/emailTemplates";

export async function GET() {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("email_templates")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data.length > 0) return NextResponse.json({ templates: data });

  const { data: seeded, error: seedError } = await ctx.supabase
    .from("email_templates")
    .insert({ ...DEFAULT_TEMPLATE, workspace_id: ctx.workspaceId, is_default: true })
    .select()
    .single();
  if (seedError) return NextResponse.json({ error: seedError.message }, { status: 500 });
  return NextResponse.json({ templates: [seeded] });
}

export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!name) return NextResponse.json({ error: "Give the template a name" }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "Add a subject line" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Add the email body" }, { status: 400 });

  const isDefault = body.is_default === true;
  if (isDefault) {
    const { error: clearError } = await ctx.supabase
      .from("email_templates")
      .update({ is_default: false })
      .eq("workspace_id", ctx.workspaceId);
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  const { data, error } = await ctx.supabase
    .from("email_templates")
    .insert({ workspace_id: ctx.workspaceId, name, subject, body: text, is_default: isDefault })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
