import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

export async function PUT(request, props) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { id: leadId } = await props.params;
  const { items } = await request.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  const { error: deleteError } = await ctx.supabase
    .from("lead_services")
    .delete()
    .eq("lead_id", leadId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  if (items.length === 0) return NextResponse.json({ items: [] });

  const rows = items.map((item, index) => ({
    workspace_id: ctx.workspaceId,
    lead_id: leadId,
    position: index,
    service_id: item.service_id,
    quantity: item.quantity ?? null,
    length: item.length ?? null,
    width: item.width ?? null,
    notes: item.notes || null,
  }));

  const { data, error: insertError } = await ctx.supabase
    .from("lead_services")
    .insert(rows)
    .select();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
