// POST /api/estimates
// Body: { leadId, lineItems: [{ service_id, pricing_type, rate_at_time, quantity, length, width, computed_area, line_total }], taxRate? }
//
// First half of "Generate PDF": locks in rates and creates a new estimate version,
// marking any previous version as superseded. The PDF is rendered by
// /api/estimates/[estimateId]/pdf.
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const { leadId, lineItems, taxRate = 0 } = body;

  if (!leadId || !Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json(
      { error: "leadId and at least one line item are required" },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await ctx.supabase
    .from("estimates")
    .select("id, version")
    .eq("lead_id", leadId)
    .order("version", { ascending: false })
    .limit(1);

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const nextVersion = (existing?.[0]?.version || 0) + 1;

  // Totals are computed here, never trusted from the client.
  const subtotal = lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  if (existing?.[0]?.id) {
    await ctx.supabase
      .from("estimates")
      .update({ status: "superseded" })
      .eq("id", existing[0].id);
  }

  const { data: newEstimate, error: insertError } = await ctx.supabase
    .from("estimates")
    .insert({
      workspace_id: ctx.workspaceId,
      lead_id: leadId,
      version: nextVersion,
      status: "draft",
      subtotal,
      tax,
      total,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const itemRows = lineItems.map((item, index) => ({
    workspace_id: ctx.workspaceId,
    estimate_id: newEstimate.id,
    position: index,
    service_id: item.service_id,
    pricing_type: item.pricing_type,
    rate_at_time: item.rate_at_time,
    quantity: item.quantity ?? null,
    length: item.length ?? null,
    width: item.width ?? null,
    computed_area: item.computed_area ?? null,
    line_total: item.line_total,
  }));

  const { error: itemsError } = await ctx.supabase.from("estimate_items").insert(itemRows);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json({ estimate: newEstimate });
}
