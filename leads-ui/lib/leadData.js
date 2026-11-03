import { createClient } from "@/lib/supabase/server";

// Server-side loaders for the lead detail page. They run as the signed-in user,
// so row-level security limits results to their workspace.

export async function getLead(leadId) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (error) {
    console.error("Error fetching lead:", error);
    return null;
  }
  return data;
}

export async function getServicesMaster() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("services_master").select("*").order("name");
  if (error) {
    console.error("Error fetching services:", error);
    return [];
  }
  return data || [];
}

export async function getLeadServices(leadId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_services")
    .select("*")
    .eq("lead_id", leadId)
    .order("position")
    .order("created_at");
  if (error) {
    console.error("Error fetching lead services:", error);
    return [];
  }
  return data || [];
}

export async function getComments(leadId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_comments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
  return data || [];
}

export async function getEstimates(leadId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching estimates:", error);
    return [];
  }
  return data || [];
}
