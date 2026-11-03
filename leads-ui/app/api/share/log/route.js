// POST /api/share/log
// Body: { estimateId, channel, recipient }
//
// Records a WhatsApp share. Email shares are logged by the sending workflow
// after a confirmed send.
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { estimateId, channel, recipient } = await request.json();

  if (!estimateId || !channel) {
    return NextResponse.json({ error: "estimateId and channel are required" }, { status: 400 });
  }

  const { error } = await ctx.supabase
    .from("estimate_shares")
    .insert({ workspace_id: ctx.workspaceId, estimate_id: estimateId, channel, recipient });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
