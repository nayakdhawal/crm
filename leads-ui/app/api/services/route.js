import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { validateService } from "@/lib/serviceValidation";

export async function GET() {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("services_master")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { value, error: validationError } = validateService(await request.json());
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from("services_master")
    .insert({ ...value, workspace_id: ctx.workspaceId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}
