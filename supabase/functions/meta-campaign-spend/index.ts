import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

interface CampaignSpend {
  campaign_id: string;
  campaign_name: string;
  internal_campaign: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  cpc: number;
  cpm: number;
  date_start: string;
  date_stop: string;
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

    // Parse request
    const { date_preset = "last_30d", date_start, date_stop } = await req.json().catch(() => ({}));

    // Get active Meta ad account with token
    const { data: adAccount, error: accountError } = await supabase
      .from("ad_accounts")
      .select("*")
      .eq("platform", "meta")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (accountError || !adAccount) {
      return new Response(
        JSON.stringify({ error: "No active Meta ad account found", code: "NO_ACCOUNT" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = adAccount.access_token_encrypted;
    const accountId = `act_${adAccount.account_id}`;

    // Build URL for insights
    const url = new URL(`${META_GRAPH_URL}/${accountId}/insights`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("level", "campaign");
    url.searchParams.set("fields", "campaign_id,campaign_name,spend,impressions,clicks,reach,cpc,cpm,date_start,date_stop");
    url.searchParams.set("limit", "100");

    if (date_start && date_stop) {
      url.searchParams.set("time_range", JSON.stringify({ since: date_start, until: date_stop }));
    } else {
      url.searchParams.set("date_preset", date_preset);
    }

    // Fetch from Meta
    const metaRes = await fetch(url.toString());
    const metaData = await metaRes.json();

    if (metaData.error) {
      return new Response(
        JSON.stringify({ error: metaData.error.message, code: "META_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get campaign mapping
    const { data: campMap } = await supabase
      .from("meta_campaign_map")
      .select("meta_campaign_id, internal_campaign");

    const mapById: Record<string, string> = {};
    (campMap || []).forEach(m => {
      mapById[m.meta_campaign_id] = m.internal_campaign;
    });

    // Process results - usar campaign_name real do Meta
    const campaigns: CampaignSpend[] = (metaData.data || []).map((row: any) => ({
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      // internal_campaign agora usa o nome real da campanha (para cruzar com crm_leads.campanha)
      internal_campaign: row.campaign_name,
      spend: parseFloat(row.spend || 0),
      impressions: parseInt(row.impressions || 0),
      clicks: parseInt(row.clicks || 0),
      reach: parseInt(row.reach || 0),
      cpc: parseFloat(row.cpc || 0),
      cpm: parseFloat(row.cpm || 0),
      date_start: row.date_start,
      date_stop: row.date_stop,
    }));

    // Calculate totals
    const totals = {
      spend: campaigns.reduce((sum, c) => sum + c.spend, 0),
      impressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
      clicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
      reach: campaigns.reduce((sum, c) => sum + c.reach, 0),
    };

    // Cache results in meta_cache table
    await supabase.from("meta_cache").upsert({
      cache_key: `campaign_spend_${date_preset}`,
      cache_data: { campaigns, totals, fetched_at: new Date().toISOString() },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min cache
    }, { onConflict: "cache_key" });

    return new Response(
      JSON.stringify({ campaigns, totals, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
