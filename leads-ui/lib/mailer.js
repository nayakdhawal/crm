import nodemailer from "nodemailer";
import { decrypt } from "@/lib/crypto";
import { sendViaGmail } from "@/lib/google";

export function isMailConfigured(settings) {
  if (settings.gmail_refresh_token) return true;
  return Boolean(settings.smtp_host && settings.smtp_port && settings.smtp_user && settings.smtp_password && settings.smtp_from_email);
}

// A connected Google account sends through Gmail's API; otherwise the workspace's SMTP settings are used.
export async function sendMail(settings, { to, subject, text, attachments = [] }) {
  const fromAddress = settings.gmail_refresh_token ? settings.gmail_email : settings.smtp_from_email;
  const fromName = settings.smtp_from_name || settings.business_name || undefined;
  const options = {
    from: fromName ? { name: fromName, address: fromAddress } : fromAddress,
    replyTo: settings.email || fromAddress,
    to,
    subject,
    text,
    attachments,
  };

  if (settings.gmail_refresh_token) {
    return sendViaGmail(decrypt(settings.gmail_refresh_token), options);
  }

  const transport = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_secure,
    auth: { user: settings.smtp_user, pass: decrypt(settings.smtp_password) },
  });
  return transport.sendMail(options);
}

export function explainSmtpError(message) {
  if (/535|BadCredentials|Username and Password not accepted|Invalid login/i.test(message)) {
    return "Gmail rejected the login. Use your full Gmail address and a 16-character app password, not your normal password. Create one at myaccount.google.com/apppasswords (2-Step Verification must be on), then save and test again.";
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(message)) {
    return "Could not reach the mail server. Check the SMTP server name and port.";
  }
  return message;
}
