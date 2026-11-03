import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { toPublicSettings } from "@/lib/settingsServer";

const BUCKET = "business-assets";
const ALLOWED = { "image/png": "png", "image/jpeg": "jpg" };
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const form = await request.formData();
  const file = form.get("logo");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Choose a PNG or JPEG logo" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Logo must be a PNG or JPEG image" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Logo must be 2 MB or smaller" }, { status: 400 });

  await supabaseServer.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const path = `${ctx.workspaceId}/logo-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabaseServer.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabaseServer.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await ctx.supabase
    .from("business_settings")
    .update({ logo_url: urlData.publicUrl })
    .eq("workspace_id", ctx.workspaceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: toPublicSettings(data) });
}
