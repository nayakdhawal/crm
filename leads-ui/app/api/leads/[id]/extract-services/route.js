import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { getSettingsRow } from "@/lib/settingsServer";

const DEFAULT_MODELS = { anthropic: "claude-sonnet-4-6", openai: "gpt-4o-mini" };

function buildPrompt(catalog, enquiry) {
  return `You map a customer's enquiry to services from a price list.

Price list (JSON):
${JSON.stringify(catalog)}

Customer enquiry:
"""
${enquiry}
"""

Return ONLY a JSON array, no other text. Each element must be:
{"service_id": "<an id copied exactly from the price list>", "quantity": <number, default 1>, "length": <number or null>, "width": <number or null>, "reason": "<short phrase>"}
Use length and width only for services whose pricing_type is per_sqft or per_sqinch, taking the dimensions from the enquiry (null if not stated). Include only services the customer clearly asked for. Return [] if none match.`;
}

async function callAnthropic(apiKey, model, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Anthropic request failed");
  return data.content?.[0]?.text ?? "";
}

async function callOpenAI(apiKey, model, prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "OpenAI request failed");
  return data.choices?.[0]?.message?.content ?? "";
}

function parseSuggestions(text, catalogIds) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("The AI reply did not contain a list");
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("The AI reply was not a list");

  return parsed
    .filter((s) => s && catalogIds.has(s.service_id))
    .map((s) => ({
      service_id: s.service_id,
      quantity: Number(s.quantity) > 0 ? Number(s.quantity) : 1,
      length: Number.isFinite(Number(s.length)) && s.length !== null ? Number(s.length) : null,
      width: Number.isFinite(Number(s.width)) && s.width !== null ? Number(s.width) : null,
      reason: typeof s.reason === "string" ? s.reason : "",
    }));
}

export async function POST(request, props) {
  const { id: leadId } = await props.params;

  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const settings = await getSettingsRow(ctx.supabase, ctx.workspaceId);
  if (!settings.ai_api_key) {
    return NextResponse.json(
      { error: "Add your AI API key in Settings first" },
      { status: 400 }
    );
  }

  const [{ data: lead, error: leadError }, { data: services, error: servicesError }] = await Promise.all([
    ctx.supabase.from("leads").select("description, raw_email_body").eq("id", leadId).single(),
    ctx.supabase.from("services_master").select("id, name, pricing_type, unit_label, rate").eq("active", true),
  ]);
  if (leadError || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (servicesError) return NextResponse.json({ error: servicesError.message }, { status: 500 });

  const enquiry = [lead.description, lead.raw_email_body].filter(Boolean).join("\n\n");
  if (!enquiry.trim()) {
    return NextResponse.json({ error: "This lead has no description to read" }, { status: 400 });
  }

  const provider = settings.ai_provider;
  const model = settings.ai_model || DEFAULT_MODELS[provider];
  const catalog = services.map(({ id, name, pricing_type, unit_label }) => ({ id, name, pricing_type, unit_label }));
  const prompt = buildPrompt(catalog, enquiry);

  try {
    const text = provider === "openai"
      ? await callOpenAI(settings.ai_api_key, model, prompt)
      : await callAnthropic(settings.ai_api_key, model, prompt);
    const items = parseSuggestions(text, new Set(services.map((s) => s.id)));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Service extraction failed:", err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
