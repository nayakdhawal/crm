import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { getSettingsRow } from "@/lib/settingsServer";
import { explainSmtpError, isMailConfigured, sendMail } from "@/lib/mailer";

export async function POST() {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const settings = await getSettingsRow(ctx.supabase, ctx.workspaceId);
  if (!isMailConfigured(settings)) {
    return NextResponse.json({ error: "Save your SMTP details first" }, { status: 400 });
  }

  const to = settings.email || ctx.user.email;
  try {
    await sendMail(settings, {
      to,
      subject: "Test email from your estimate system",
      text: "This is a test. If you received it, your email settings work.",
    });
  } catch (err) {
    return NextResponse.json({ error: explainSmtpError(err.message) }, { status: 502 });
  }

  return NextResponse.json({ success: true, sentTo: to });
}
