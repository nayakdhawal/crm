import { NextResponse } from "next/server";
import { createClient, getWorkspaceId, requireWorkspace } from "@/lib/supabase/server";

const WORKSPACE_NAME_MAX = 10;

export async function GET() {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("workspaces")
    .select("id, name, favicon_url")
    .eq("id", ctx.workspaceId)
    .single();
  if (error || !data) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  return NextResponse.json({ workspace: data });
}

export async function PATCH(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { name } = await request.json();
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return NextResponse.json({ error: "Enter a workspace name" }, { status: 400 });
  if (trimmed.length > WORKSPACE_NAME_MAX) {
    return NextResponse.json({ error: `Workspace name can be ${WORKSPACE_NAME_MAX} characters at most` }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("workspaces")
    .update({ name: trimmed })
    .eq("id", ctx.workspaceId)
    .select("id, name, favicon_url")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ workspace: data });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  if (await getWorkspaceId()) {
    return NextResponse.json({ error: "You already have a workspace" }, { status: 409 });
  }

  const { name } = await request.json();
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return NextResponse.json({ error: "Business name is required" }, { status: 400 });

  const { data, error } = await supabase.rpc("create_workspace", { workspace_name: trimmed });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspaceId: data }, { status: 201 });
}
