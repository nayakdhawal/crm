const PUBLIC_FIELDS = [
  "business_name", "address", "phone", "email", "website", "tax_id", "logo_url",
  "estimate_header", "estimate_footer", "ai_provider", "ai_model",
  "smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_from_name", "smtp_from_email",
  "lead_include_keywords", "lead_exclude_keywords", "lead_blocked_senders",
];

export async function getSettingsRow(supabase, workspaceId) {
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export function toPublicSettings(row) {
  const pub = {};
  for (const field of PUBLIC_FIELDS) pub[field] = row[field] ?? null;
  pub.ai_key_set = Boolean(row.ai_api_key);
  pub.ai_key_hint = row.ai_api_key ? row.ai_api_key.slice(-4) : null;
  pub.smtp_password_set = Boolean(row.smtp_password);
  pub.gmail_connected = Boolean(row.gmail_refresh_token);
  pub.gmail_email = row.gmail_email ?? null;
  return pub;
}
