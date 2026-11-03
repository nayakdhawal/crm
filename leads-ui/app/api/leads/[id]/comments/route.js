import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";

export async function POST(request, props) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { id: leadId } = await props.params;
  const { text } = await request.json();
  const commentText = typeof text === "string" ? text.trim() : "";

  if (!commentText) {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("lead_comments")
    .insert({ workspace_id: ctx.workspaceId, lead_id: leadId, comment_text: commentText })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
