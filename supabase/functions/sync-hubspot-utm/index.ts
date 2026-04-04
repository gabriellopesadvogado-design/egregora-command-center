import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de campanhas do Meta para nomes internos
const CAMPAIGN_MAP: Record<string, string> = {
  "[Y][Leads] - Leadads — Cópia [25.04]": "Meta_Leadads_Principal",
  "Campanha Escala": "Meta_Escala",
  "Nova campanha de Leads": "Meta_Nova_Leads",
  "Leadads": "Meta_Leadads_Principal",
  "leadads": "Meta_Leadads_Principal",
};

// Campanhas ativas no Meta (para inferir quando {{campaign.name}} não resolve)
// Atualizar conforme mudar as campanhas ativas
const ACTIVE_META_CAMPAIGNS = [
  "Meta_Leadads_Principal", // Principal - maior volume
  "Meta_Escala",            // Segunda maior
];

// Mapeamento de sources para canais
const SOURCE_MAP: Record<string, string> = {
  "PAID_SOCIAL": "Meta_Ads",
  "PAID_SEARCH": "Google_Ads",
  "ORGANIC_SEARCH": "Organico_Google",
  "SOCIAL_MEDIA": "Organico_Social",
  "DIRECT_TRAFFIC": "Direto",
  "OFFLINE": "Offline",
  "REFERRALS": "Indicacao",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar token do HubSpot da tabela api_credentials
    const { data: hubspotCred } = await supabase
      .from("api_credentials")
      .select("value_encrypted")
      .eq("provider", "hubspot")
      .eq("is_valid", true)
      .single();

    // Token do HubSpot
    const HUBSPOT_TOKEN = hubspotCred?.value_encrypted || Deno.env.get("HUBSPOT_TOKEN");
    
    if (!HUBSPOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "HubSpot token not configured. Add to api_credentials table." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mode = "recent", limit = 100 } = await req.json().catch(() => ({}));

    // Buscar contatos do HubSpot
    const searchBody: any = {
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
      properties: [
        "firstname", "lastname", "phone", "mobilephone", "email",
        "utm_source", "utm_medium", "utm_campaign", "utm_content",
        "hs_analytics_source", "hs_analytics_source_data_1", "hs_analytics_source_data_2",
        "createdate"
      ],
      limit: Math.min(limit, 100),
    };

    if (mode === "recent") {
      // Últimos 7 dias
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      searchBody.filterGroups = [{
        filters: [{ propertyName: "createdate", operator: "GTE", value: weekAgo }]
      }];
    }

    const hubspotRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    const hubspotData = await hubspotRes.json();

    if (!hubspotData.results) {
      return new Response(
        JSON.stringify({ error: hubspotData.message || "HubSpot error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const contact of hubspotData.results) {
      const props = contact.properties || {};
      const phone = (props.mobilephone || props.phone || "").replace(/\D/g, "");
      
      if (!phone || phone.length < 10) {
        skipped++;
        continue;
      }

      // Normalizar telefone
      let normalizedPhone = phone;
      if (phone.length === 11) normalizedPhone = "55" + phone;
      else if (phone.length === 10) normalizedPhone = "55" + phone;

      // Determinar campanha
      let campanha = props.utm_campaign || "";
      const source = props.hs_analytics_source || "";
      const drill1 = props.hs_analytics_source_data_1 || "";
      
      // Se a campanha é uma variável não resolvida {{campaign.name}}
      if (campanha.includes("{{")) {
        // É do Meta (PAID_SOCIAL + Facebook) - atribuir à campanha principal ativa
        if (source === "PAID_SOCIAL" && drill1.toLowerCase().includes("facebook")) {
          campanha = ACTIVE_META_CAMPAIGNS[0]; // Meta_Leadads_Principal
        } else {
          campanha = "";
        }
      }

      // Mapear para nome interno se tiver valor
      if (campanha && !campanha.startsWith("Meta_") && !campanha.startsWith("Google_")) {
        campanha = CAMPAIGN_MAP[campanha] || campanha;
      }

      // Se ainda não tem campanha, derivar do analytics_source
      if (!campanha) {
        if (source === "PAID_SOCIAL" && drill1.toLowerCase().includes("facebook")) {
          // Meta Ads sem UTM específico - usar campanha principal
          campanha = ACTIVE_META_CAMPAIGNS[0];
        } else if (source === "PAID_SEARCH") {
          campanha = "Google_Ads";
        } else if (source === "ORGANIC_SEARCH") {
          campanha = "Organico_Google";
        } else if (source === "SOCIAL_MEDIA") {
          // Orgânico de redes sociais
          if (drill1.toLowerCase().includes("instagram")) {
            campanha = "Organico_Instagram";
          } else if (drill1.toLowerCase().includes("facebook")) {
            campanha = "Organico_Facebook";
          } else {
            campanha = "Organico_Social";
          }
        } else if (source === "DIRECT_TRAFFIC") {
          campanha = "Direto";
        } else if (source === "OFFLINE") {
          campanha = "Offline_Manual";
        } else if (source) {
          campanha = SOURCE_MAP[source] || source;
        }
      }

      // Canal baseado no source
      const canal = SOURCE_MAP[props.hs_analytics_source || ""] || props.hs_analytics_source || null;

      // Buscar lead no Supabase pelo telefone
      const { data: existingLead } = await supabase
        .from("crm_leads")
        .select("id, campanha")
        .or(`telefone.ilike.%${normalizedPhone}%,whatsapp.ilike.%${normalizedPhone}%`)
        .limit(1)
        .single();

      if (existingLead && !existingLead.campanha && campanha) {
        // Atualizar apenas se não tinha campanha
        const { error: updateError } = await supabase
          .from("crm_leads")
          .update({
            campanha,
            canal,
            utm_source: props.utm_source || null,
            utm_medium: props.utm_medium || null,
            utm_campaign: props.utm_campaign || null,
            utm_content: props.utm_content || null,
          })
          .eq("id", existingLead.id);

        if (updateError) {
          errors.push(`${phone}: ${updateError.message}`);
        } else {
          updated++;
        }
      } else {
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: hubspotData.results.length,
        updated,
        skipped,
        errors: errors.slice(0, 10),
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
