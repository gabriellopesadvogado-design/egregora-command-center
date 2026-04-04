import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de campanhas
const CAMPAIGN_MAP: Record<string, string> = {
  "[Y][Leads] - Leadads — Cópia [25.04]": "Meta_Leadads_Principal",
  "Campanha Escala": "Meta_Escala",
  "Nova campanha de Leads": "Meta_Nova_Leads",
  "Leadads": "Meta_Leadads_Principal",
};

const SOURCE_MAP: Record<string, string> = {
  "PAID_SOCIAL": "Meta_Ads",
  "PAID_SEARCH": "Google_Ads",
  "ORGANIC_SEARCH": "Organico_Google",
  "SOCIAL_MEDIA": "Organico_Social",
  "DIRECT_TRAFFIC": "Direto",
  "OFFLINE": "Offline",
  "REFERRALS": "Indicacao",
};

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) cleaned = "55" + cleaned;
  else if (cleaned.length === 10) cleaned = "55" + cleaned;
  return cleaned;
}

function deriveCampaign(props: Record<string, string>): string {
  let campanha = props.utm_campaign || "";
  const source = props.hs_analytics_source || "";
  const drill1 = props.hs_analytics_source_data_1 || "";

  // Se tem {{campaign.name}} não resolvido, usar campanha principal do Meta
  if (campanha.includes("{{")) {
    if (source === "PAID_SOCIAL" && drill1.toLowerCase().includes("facebook")) {
      return "Meta_Leadads_Principal";
    }
    campanha = "";
  }

  // Mapear nome de campanha
  if (campanha && CAMPAIGN_MAP[campanha]) {
    return CAMPAIGN_MAP[campanha];
  }
  if (campanha) return campanha;

  // Derivar do source
  if (source === "PAID_SOCIAL" && drill1.toLowerCase().includes("facebook")) {
    return "Meta_Leadads_Principal";
  }
  if (source === "PAID_SEARCH") return "Google_Ads";
  if (source === "ORGANIC_SEARCH") return "Organico_Google";
  if (source === "SOCIAL_MEDIA") {
    if (drill1.toLowerCase().includes("instagram")) return "Organico_Instagram";
    return "Organico_Social";
  }
  if (source === "DIRECT_TRAFFIC") return "Direto";
  if (source === "OFFLINE") return "Offline_Manual";
  
  return SOURCE_MAP[source] || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar token do HubSpot
    const { data: hubspotCred } = await supabase
      .from("api_credentials")
      .select("value_encrypted")
      .eq("provider", "hubspot")
      .eq("is_valid", true)
      .single();

    const HUBSPOT_TOKEN = hubspotCred?.value_encrypted;
    if (!HUBSPOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "HubSpot token not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { since_hours = 24, limit = 100, test_only = true } = await req.json().catch(() => ({}));

    // Se test_only, buscar lista de números de teste
    let testPhones: string[] = [];
    if (test_only) {
      const { data: testNumbers } = await supabase
        .from("test_phone_numbers")
        .select("phone_number")
        .eq("is_active", true);
      
      testPhones = (testNumbers || []).map(t => t.phone_number.replace(/\D/g, ""));
      
      if (testPhones.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No test numbers configured", created: 0, updated: 0, skipped: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Buscar contatos recentes do HubSpot
    const sinceDate = new Date(Date.now() - since_hours * 60 * 60 * 1000).toISOString();
    
    const hubspotRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: "createdate", operator: "GTE", value: sinceDate }]
        }],
        sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
        properties: [
          "firstname", "lastname", "email", "phone", "mobilephone",
          "utm_source", "utm_medium", "utm_campaign", "utm_content",
          "hs_analytics_source", "hs_analytics_source_data_1", "hs_analytics_source_data_2",
          "createdate"
        ],
        limit: Math.min(limit, 100),
      }),
    });

    const hubspotData = await hubspotRes.json();

    if (!hubspotData.results) {
      return new Response(
        JSON.stringify({ error: hubspotData.message || "HubSpot error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const contact of hubspotData.results) {
      const props = contact.properties || {};
      const hubspotId = contact.id;
      const phone = normalizePhone(props.mobilephone || props.phone || "");
      
      if (!phone || phone.length < 10) {
        skipped++;
        continue;
      }

      // Se test_only, verificar se o telefone está na lista de teste
      if (test_only && testPhones.length > 0) {
        const isTestPhone = testPhones.some(tp => phone.includes(tp) || tp.includes(phone));
        if (!isTestPhone) {
          skipped++;
          continue;
        }
      }

      const nome = `${props.firstname || ""} ${props.lastname || ""}`.trim() || "Sem Nome";
      const email = props.email || null;
      const campanha = deriveCampaign(props);
      const canal = SOURCE_MAP[props.hs_analytics_source || ""] || null;

      // Verificar se já existe pelo hubspot_contact_id ou telefone
      const { data: existingLead } = await supabase
        .from("crm_leads")
        .select("id, campanha")
        .or(`hubspot_contact_id.eq.${hubspotId},telefone.ilike.%${phone}%,whatsapp.ilike.%${phone}%`)
        .limit(1)
        .single();

      if (existingLead) {
        // Atualizar se não tinha campanha
        if (!existingLead.campanha && campanha) {
          await supabase
            .from("crm_leads")
            .update({
              campanha,
              canal,
              utm_source: props.utm_source || null,
              utm_medium: props.utm_medium || null,
              utm_campaign: props.utm_campaign || null,
            })
            .eq("id", existingLead.id);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Criar novo lead
        const { error } = await supabase
          .from("crm_leads")
          .insert({
            hubspot_contact_id: hubspotId,
            nome,
            email,
            telefone: phone,
            whatsapp: phone,
            campanha,
            canal,
            utm_source: props.utm_source || null,
            utm_medium: props.utm_medium || null,
            utm_campaign: props.utm_campaign || null,
            utm_content: props.utm_content || null,
          });

        if (!error) {
          created++;
        } else {
          skipped++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        hubspot_total: hubspotData.results.length,
        created,
        updated,
        skipped,
        since: sinceDate,
        test_only,
        test_phones_count: testPhones.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
