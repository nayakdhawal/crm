import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabaseServer";

const BUCKET = "business-assets";
const ALLOWED = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};
const MAX_BYTES = 512 * 1024;

export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const form = await request.formData();
  const file = form.get("favicon");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Choose a favicon image" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Favicon must be a PNG, JPEG, SVG or ICO image" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Favicon must be 512 KB or smaller" }, { status: 400 });

  await supabaseServer.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const path = `${ctx.workspaceId}/favicon-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabaseServer.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabaseServer.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await ctx.supabase
    .from("workspaces")
    .update({ favicon_url: urlData.publicUrl })
    .eq("id", ctx.workspaceId)
    .select("id, name, favicon_url")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ workspace: data });
}
