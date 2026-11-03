import MailComposer from "nodemailer/lib/mail-composer";

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.send",
];

export function appUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

export function googleRedirectUri() {
  return `${appUrl()}/api/auth/google/callback`;
}

export function googleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Google sign-in failed");
  return data;
}

export function emailFromIdToken(idToken) {
  const payload = idToken.split(".")[1];
  const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return json.email;
}

async function accessTokenFor(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Google session expired. Reconnect your account in Settings.");
  return data.access_token;
}

// Builds the RFC 822 message with nodemailer, then sends it through Gmail's API.
export async function sendViaGmail(refreshToken, mailOptions) {
  const accessToken = await accessTokenFor(refreshToken);
  const raw = await new Promise((resolve, reject) => {
    new MailComposer(mailOptions).compile().build((err, message) => (err ? reject(err) : resolve(message)));
  });

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: raw.toString("base64url") }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Gmail could not send the email");
  }
  return res.json();
}
