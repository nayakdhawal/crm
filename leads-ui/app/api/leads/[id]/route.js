import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

const EDITABLE_FIELDS = [
  "status", "callback_date", "phone", "location", "description",
  "opportunity_score", "lead_value", "currency", "lead_origin", "lead_date",
];

export async function PATCH(request, props) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { id } = await props.params;
  const body = await request.json();
  const patch = Object.fromEntries(
    Object.entries(body).filter(([key]) => EDITABLE_FIELDS.includes(key))
  );

  const { data, error } = await ctx.supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
