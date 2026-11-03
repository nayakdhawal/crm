// app/leads/[id]/page.js
import { notFound, redirect } from "next/navigation";
import {
  getLead,
  getServicesMaster,
  getLeadServices,
  getComments,
  getEstimates,
} from "@/lib/leadData";
import { createClient, getWorkspaceId } from "@/lib/supabase/server";
import { getSettingsRow } from "@/lib/settingsServer";
import LeadDetailClient from "./LeadDetailClient";

export default async function LeadDetailPage(props) {
  const { id } = await props.params;

  const workspaceId = await getWorkspaceId();
  if (!workspaceId) redirect("/onboarding");

  const lead = await getLead(id);
  if (!lead) notFound();

  const supabase = await createClient();
  const [servicesMaster, leadServices, comments, estimates, settings] = await Promise.all([
    getServicesMaster(),
    getLeadServices(lead.id),
    getComments(lead.id),
    getEstimates(lead.id),
    getSettingsRow(supabase, workspaceId),
  ]);

  return (
    <LeadDetailClient
      lead={lead}
      servicesMaster={servicesMaster}
      initialLeadServices={leadServices}
      initialComments={comments}
      initialEstimates={estimates}
      aiReady={Boolean(settings.ai_api_key)}
    />
  );
}
