// POST /api/estimates/:estimateId/pdf
//
// Renders the PDF for an already-created estimate, uploads it to Supabase Storage,
// and stores the URL on the estimate row. Reads run as the signed-in user; only the
// storage upload uses the service role, after the estimate has been read under RLS.
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { requireWorkspace } from "@/lib/supabase/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSettingsRow } from "@/lib/settingsServer";

async function fetchLogoDataUri(url) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "image/png";
  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return `data:${type};base64,${base64}`;
}

function renderPdf(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), "scripts", "render-estimate-pdf.cjs")]);
    const chunks = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(stderr || `PDF renderer exited with code ${code}`));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

export async function POST(request, props) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { estimateId } = await props.params;

  const { data: estimate, error: estError } = await ctx.supabase
    .from("estimates")
    .select("*, leads(*)")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const { data: items, error: itemsError } = await ctx.supabase
    .from("estimate_items")
    .select("*, services_master(name)")
    .eq("estimate_id", estimateId)
    .order("position");

  if (itemsError) return NextResponse.json({ error: "Failed to load estimate items" }, { status: 500 });

  let pdfBuffer;
  try {
    const settings = await getSettingsRow(ctx.supabase, ctx.workspaceId);
    const company = {
      name: settings.business_name || "Your business",
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      tax_id: settings.tax_id,
      header: settings.estimate_header,
      footer: settings.estimate_footer,
      logo: await fetchLogoDataUri(settings.logo_url),
    };
    pdfBuffer = await renderPdf({
      company,
      lead: estimate.leads,
      estimate,
      items: items.map((item) => ({ ...item, name: item.services_master?.name })),
    });
  } catch (err) {
    console.error("PDF render failed:", err);
    return NextResponse.json({ error: "Failed to render the PDF" }, { status: 500 });
  }

  const filePath = `${ctx.workspaceId}/${estimate.lead_id}/v${estimate.version}.pdf`;

  const { error: uploadError } = await supabaseServer.storage
    .from("estimate-pdfs")
    .upload(filePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrlData } = supabaseServer.storage.from("estimate-pdfs").getPublicUrl(filePath);
  const pdfUrl = publicUrlData.publicUrl;

  await ctx.supabase.from("estimates").update({ pdf_url: pdfUrl }).eq("id", estimateId);

  return NextResponse.json({ pdf_url: pdfUrl });
}
