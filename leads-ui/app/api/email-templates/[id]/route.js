// PATCH  /api/email-templates/[id]  → update a template
// DELETE /api/email-templates/[id]  → remove a template
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

const EDITABLE = ["name", "subject", "body"];

export async function PATCH(request, props) {
  const { id } = await props.params;
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const patch = {};
  for (const field of EDITABLE) {
    if (field in body) {
      const value = typeof body[field] === "string" ? body[field].trim() : "";
      if (!value) return NextResponse.json({ error: `${field} cannot be empty` }, { status: 400 });
      patch[field] = value;
    }
  }

  if (body.is_default === true) {
    const { error: clearError } = await ctx.supabase
      .from("email_templates")
      .update({ is_default: false })
      .eq("workspace_id", ctx.workspaceId);
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
    patch.is_default = true;
  }

  const { data, error } = await ctx.supabase
    .from("email_templates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(request, props) {
  const { id } = await props.params;
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { error } = await ctx.supabase
    .from("email_templates")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
