// Reads recent emails from the workspace's inbox over IMAP, using the same account and
// app password as sending. No Google Cloud setup is needed.
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { decrypt } from "@/lib/crypto";

const IMAP_HOSTS = {
  "smtp.gmail.com": "imap.gmail.com",
  "smtp.office365.com": "outlook.office365.com",
  "smtp.mail.yahoo.com": "imap.mail.yahoo.com",
};

const LOOKBACK_DAYS = 14;
const MAX_MESSAGES = 100;

export function inboxSupported(settings) {
  return Boolean(IMAP_HOSTS[settings.smtp_host] && settings.smtp_user && settings.smtp_password);
}

function connectInbox(settings) {
  return new ImapFlow({
    host: IMAP_HOSTS[settings.smtp_host],
    port: 993,
    secure: true,
    auth: { user: settings.smtp_user, pass: decrypt(settings.smtp_password) },
    logger: false,
  });
}

export async function fetchRecentEmails(settings) {
  const client = connectInbox(settings);

  await client.connect();
  const emails = [];
  const lock = await client.getMailboxLock("INBOX");
  try {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const uids = (await client.search({ since }, { uid: true })) || [];
    const recent = uids.slice(-MAX_MESSAGES);
    if (recent.length === 0) return emails;

    // Fetching the source does not mark the email as read.
    for await (const message of client.fetch(recent, { uid: true, source: true }, { uid: true })) {
      const parsed = await simpleParser(message.source);
      const from = parsed.from?.value?.[0] || {};
      emails.push({
        messageId: parsed.messageId || `uid-${message.uid}`,
        fromEmail: (from.address || "").toLowerCase(),
        fromName: from.name || "",
        subject: parsed.subject || "",
        receivedAt: parsed.date ? parsed.date.toISOString() : null,
        body: (parsed.text || "").trim(),
      });
    }
  } finally {
    lock.release();
    await client.logout();
  }
  return emails;
}

// Looks up when each stored email was originally sent. Each lookup is { key, messageId, fromEmail, subject }.
// Matches by Message-ID when there is one. Otherwise matches by sender and subject, and only when exactly
// one email in the inbox fits, so a repeated newsletter subject never gets the wrong date.
// Returns a Map of key → ISO date string for the lookups it could resolve.
export async function findEmailTimes(settings, lookups) {
  const times = new Map();
  if (lookups.length === 0) return times;

  const client = connectInbox(settings);
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    for (const lookup of lookups) {
      let query = null;
      if (lookup.messageId) query = { header: { "message-id": lookup.messageId } };
      else if (lookup.fromEmail && lookup.subject) query = { from: lookup.fromEmail, subject: lookup.subject };
      if (!query) continue;

      const uids = (await client.search(query, { uid: true })) || [];
      if (uids.length !== 1) continue;

      const message = await client.fetchOne(uids[0], { envelope: true }, { uid: true });
      if (message?.envelope?.date) times.set(lookup.key, message.envelope.date.toISOString());
    }
  } finally {
    lock.release();
    await client.logout();
  }
  return times;
}
