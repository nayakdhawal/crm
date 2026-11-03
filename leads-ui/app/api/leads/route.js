import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data || [] });
}

export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const body = await request.json();

  const leadData = {
    workspace_id: ctx.workspaceId,
    sender_name: body.sender_name,
    sender_email: body.sender_email,
    phone: body.phone || null,
    location: body.location || null,
    description: body.description || null,
    source: body.source || "manual",
    status: body.status || "new",
    lead_date: body.lead_date || null,
    opportunity_score: body.opportunity_score || null,
    lead_value: body.lead_value || null,
    currency: body.currency || "INR",
    lead_origin: body.lead_origin || null,
  };

  const { data, error } = await ctx.supabase
    .from("leads")
    .insert([leadData])
    .select()
    .single();

  if (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data }, { status: 201 });
}
