import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { validateService } from "@/lib/serviceValidation";

// Replaces the active rate card. Old services are archived, not deleted, so
// estimates and lead items that reference them keep their names and rates.
export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { items } = await request.json();

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Nothing to import" }, { status: 400 });
  }

  const rows = [];
  for (const item of items) {
    const { value, error } = validateService({ ...item, unit_label: item.unit });
    if (error) return NextResponse.json({ error: `${item.name || "An item"}: ${error}` }, { status: 400 });
    rows.push({
      ...value,
      category: typeof item.section === "string" ? item.section : value.category,
      active: true,
      workspace_id: ctx.workspaceId,
    });
  }

  const { data: previous, error: previousError } = await ctx.supabase
    .from("services_master")
    .select("id")
    .eq("active", true);
  if (previousError) return NextResponse.json({ error: previousError.message }, { status: 500 });

  const { data: inserted, error: insertError } = await ctx.supabase
    .from("services_master")
    .insert(rows)
    .select("id");
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const previousIds = previous.map((r) => r.id);
  if (previousIds.length > 0) {
    const { error: archiveError } = await ctx.supabase
      .from("services_master")
      .update({ active: false })
      .in("id", previousIds);
    if (archiveError) return NextResponse.json({ error: archiveError.message }, { status: 500 });
  }

  return NextResponse.json({ imported: inserted.length, archived: previousIds.length });
}
