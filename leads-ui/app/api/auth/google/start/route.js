import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { requireWorkspace } from "@/lib/supabase/server";
import { appUrl, googleAuthUrl } from "@/lib/google";

export async function GET() {
  const ctx = await requireWorkspace();
  if (ctx.error) return NextResponse.redirect(`${appUrl()}/login`);

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${appUrl()}/settings?tab=email&gmail=not-configured`);
  }

  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(googleAuthUrl(state));
}
