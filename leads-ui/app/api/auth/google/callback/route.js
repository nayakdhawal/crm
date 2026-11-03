import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireWorkspace } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { appUrl, emailFromIdToken, exchangeCodeForTokens } from "@/lib/google";

function back(result) {
  return NextResponse.redirect(`${appUrl()}/settings?tab=email&gmail=${result}`);
}

export async function GET(request) {
  const ctx = await requireWorkspace();
  if (ctx.error) return NextResponse.redirect(`${appUrl()}/login`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gmail_oauth_state")?.value;
  cookieStore.delete("gmail_oauth_state");

  if (searchParams.get("error")) return back("cancelled");
  if (!code || !state || !expectedState || state !== expectedState) return back("error");

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) return back("error");

    const { error } = await ctx.supabase
      .from("business_settings")
      .update({
        gmail_refresh_token: encrypt(tokens.refresh_token),
        gmail_email: emailFromIdToken(tokens.id_token),
      })
      .eq("workspace_id", ctx.workspaceId);

    if (error) {
      console.error("Saving Gmail connection failed:", error);
      return back("error");
    }
    return back("connected");
  } catch (err) {
    console.error("Google sign-in failed:", err);
    return back("error");
  }
}
