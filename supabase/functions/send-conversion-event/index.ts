import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_CONVERSIONS_URL = "https://graph.facebook.com/v21.0";

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { meeting_id, action } = await req.json();

    if (action === "send_purchase") {
      // Buscar meeting e configurações
      const { data: meeting, error: meetingError } = await supabase
        .from("crm_meetings")
        .select(`
          *,
          crm_leads!inner(*)
        `)
        .eq("id", meeting_id)
        .single();

      if (meetingError || !meeting) {
        throw new Error("Meeting não encontrado");
      }

      const { data: settings } = await supabase
        .from("conversions_settings")
        .select("*")
        .single();

      if (!settings) {
        throw new Error("Configurações de conversão não encontradas");
      }

      const results: any = { meta: null, google: null };

      // Enviar para Meta
      if (settings.meta_enabled && settings.meta_pixel_id && settings.meta_conversions_token) {
        const lead = meeting.crm_leads;
        
        const userData: any = {};
        if (lead.email) {
          userData.em = [await hashSHA256(lead.email)];
        }
        if (lead.telefone || lead.whatsapp) {
          const phone = (lead.whatsapp || lead.telefone).replace(/\D/g, "");
          userData.ph = [await hashSHA256(phone)];
        }

        const eventData = {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: userData,
          custom_data: {
            currency: "BRL",
            value: meeting.valor_fechamento || 0,
            content_name: meeting.tipo_servico || "Naturalização",
          },
        };

        const payload = {
          data: [eventData],
          ...(settings.meta_test_event_code && { test_event_code: settings.meta_test_event_code }),
        };

        const metaRes = await fetch(
          `${META_CONVERSIONS_URL}/${settings.meta_pixel_id}/events?access_token=${settings.meta_conversions_token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const metaData = await metaRes.json();
        results.meta = { success: metaRes.ok, data: metaData };

        // Registrar evento
        await supabase.from("conversions_events").insert({
          meeting_id,
          lead_id: lead.id,
          platform: "meta",
          event_name: "Purchase",
          value: meeting.valor_fechamento,
          pixel_id: settings.meta_pixel_id,
          user_email_hash: userData.em?.[0],
          user_phone_hash: userData.ph?.[0],
          status: metaRes.ok ? "sent" : "failed",
          response_data: metaData,
          error_message: metaRes.ok ? null : JSON.stringify(metaData),
          sent_at: metaRes.ok ? new Date().toISOString() : null,
        });
      }

      // TODO: Implementar envio para Google Ads

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
