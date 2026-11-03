// Shared by the client (composer, template editor) and the server (send route).
// Keep this file free of server-only imports.

export const MERGE_TAGS = [
  { tag: "customer_name", label: "Customer name" },
  { tag: "business_name", label: "Business name" },
  { tag: "business_phone", label: "Business phone" },
  { tag: "estimate_version", label: "Estimate version" },
  { tag: "estimate_total", label: "Estimate total" },
];

export const DEFAULT_TEMPLATE = {
  name: "Standard estimate",
  subject: "Your estimate from {{business_name}} (v{{estimate_version}})",
  body: "Hi {{customer_name}},\n\nPlease find your estimate (version {{estimate_version}}, total {{estimate_total}}) attached.\n\nLet us know if you have any questions.\n\n{{business_name}}",
};

const TAG_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export function renderTemplate(text, vars) {
  return text.replace(TAG_PATTERN, (match, key) => (key in vars ? vars[key] : match));
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value);
}

// Splits what the user typed or pasted into addresses. Commas, semicolons and spaces all work.
export function parseRecipients(text) {
  return text
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
