// Keyword rules that decide which incoming emails become leads.
// Shared by the Settings form (normalizeRuleList) and the inbox import (matchesLeadRules).

export const MAX_RULE_ITEMS = 50;

// Plain-language labels for the reasons stored on skipped emails.
export const REASON_LABELS = {
  "blocked sender": "Blocked sender",
  "excluded keyword": "Contains an excluded word",
  "no included keyword": "No keyword match",
};

// Lowercases, trims and removes duplicates. Accepts an array or a comma-separated string.
export function normalizeRuleList(input) {
  const items = Array.isArray(input) ? input : String(input ?? "").split(",");
  const cleaned = items.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  return [...new Set(cleaned)].slice(0, MAX_RULE_ITEMS);
}

// "@domain.com" matches everyone at that domain; "name@domain.com" matches one address.
// A bare domain such as "domain.com" is treated as "@domain.com".
function isBlockedSender(fromEmail, blocked) {
  return blocked.some((entry) => {
    if (entry.includes("@") && !entry.startsWith("@")) return fromEmail === entry;
    const domain = entry.startsWith("@") ? entry : `@${entry}`;
    return fromEmail.endsWith(domain);
  });
}

// Returns { ok: true } or { ok: false, reason } for one incoming email.
export function matchesLeadRules({ subject, body, fromEmail }, rules) {
  const sender = (fromEmail || "").toLowerCase();
  const text = `${subject || ""}\n${body || ""}`.toLowerCase();

  if (isBlockedSender(sender, rules.blockedSenders)) return { ok: false, reason: "blocked sender" };

  if (rules.excludeKeywords.some((k) => text.includes(k))) return { ok: false, reason: "excluded keyword" };

  if (rules.includeKeywords.length > 0 && !rules.includeKeywords.some((k) => text.includes(k))) {
    return { ok: false, reason: "no included keyword" };
  }

  return { ok: true };
}
