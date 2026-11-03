// GET /api/skipped-emails?status=pending|converted|dismissed
// Emails the Lead rules skipped, newest first. Defaults to the pending review queue.
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

const STATUSES = ["pending", "converted", "dismissed"];

export async function GET(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const requested = new URL(request.url).searchParams.get("status") || "pending";
  const status = STATUSES.includes(requested) ? requested : "pending";

  const { data, error } = await ctx.supabase
    .from("skipped_emails")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ emails: data });
}
