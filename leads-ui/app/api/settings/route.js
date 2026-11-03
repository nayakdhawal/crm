import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { getSettingsRow, toPublicSettings } from "@/lib/settingsServer";
import { encrypt } from "@/lib/crypto";
import { normalizeRuleList } from "@/lib/leadRules";

const LEAD_RULE_FIELDS = ["lead_include_keywords", "lead_exclude_keywords", "lead_blocked_senders"];

const TEXT_FIELDS = [
  "business_name", "address", "phone", "email", "website", "tax_id",
  "estimate_header", "estimate_footer", "ai_model",
];

export async function GET() {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  try {
    const row = await getSettingsRow(ctx.supabase, ctx.workspaceId);
    return NextResponse.json({ settings: toPublicSettings(row) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const patch = {};

  for (const field of TEXT_FIELDS) {
    if (field in body) patch[field] = typeof body[field] === "string" ? body[field].trim() || null : null;
  }

  if ("ai_provider" in body) {
    if (!["anthropic", "openai"].includes(body.ai_provider)) {
      return NextResponse.json({ error: "Unsupported AI provider" }, { status: 400 });
    }
    patch.ai_provider = body.ai_provider;
  }

  const SMTP_TEXT = ["smtp_host", "smtp_user", "smtp_from_name", "smtp_from_email"];
  for (const field of SMTP_TEXT) {
    if (field in body) patch[field] = typeof body[field] === "string" ? body[field].trim() || null : null;
  }
  if ("smtp_port" in body) {
    const port = Number(body.smtp_port);
    patch.smtp_port = Number.isInteger(port) && port > 0 && port < 65536 ? port : null;
  }
  if ("smtp_secure" in body) patch.smtp_secure = body.smtp_secure === true;

  for (const field of LEAD_RULE_FIELDS) {
    if (field in body) patch[field] = normalizeRuleList(body[field]);
  }
  if (body.disconnect_gmail === true) {
    patch.gmail_refresh_token = null;
    patch.gmail_email = null;
  }

  if (body.clear_smtp_password === true) {
    patch.smtp_password = null;
  } else if (typeof body.smtp_password === "string" && body.smtp_password.length > 0) {
    patch.smtp_password = encrypt(body.smtp_password);
  }

  if (body.clear_ai_key === true) {
    patch.ai_api_key = null;
  } else if (typeof body.ai_api_key === "string" && body.ai_api_key.trim()) {
    patch.ai_api_key = body.ai_api_key.trim();
  }

  const { data, error } = await ctx.supabase
    .from("business_settings")
    .update(patch)
    .eq("workspace_id", ctx.workspaceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: toPublicSettings(data) });
}
