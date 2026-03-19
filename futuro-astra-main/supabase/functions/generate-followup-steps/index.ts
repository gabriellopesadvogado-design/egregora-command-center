import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
};

const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().split("T")[0];
};

const diffDays = (a: string, b: string): number => {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.floor((db - da) / (1000 * 60 * 60 * 24));
};

const toSaoPauloDate = (isoString: string): string => {
  const d = new Date(isoString);
  const parts = d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return parts; // YYYY-MM-DD
};

const todayStr = (): string => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
};

interface CadenceStep {
  codigo: string;
  canal: "whatsapp" | "ligacao";
  computeDate: (dc: string, d0: string) => string;
  condition?: (dc: string, d0: string) => boolean;
}

const CADENCE: CadenceStep[] = [
  { codigo: "POS-WA",    canal: "whatsapp", computeDate: (_dc, d0) => d0 },
  { codigo: "CONF-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, -1), condition: (dc, d0) => diffDays(d0, dc) >= 2 },
  { codigo: "DC-LIG",    canal: "ligacao",  computeDate: (dc) => dc },
  { codigo: "DC-WA",     canal: "whatsapp", computeDate: (dc) => dc },
  { codigo: "BAT1-LIG",  canal: "ligacao",  computeDate: (dc) => addDays(dc, 1) },
  { codigo: "BAT1-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, 1) },
  { codigo: "BAT2-LIG",  canal: "ligacao",  computeDate: (dc) => addDays(dc, 2) },
  { codigo: "BAT2-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, 2) },
  { codigo: "BAT3-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, 3) },
  { codigo: "PAD6-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, 6) },
  { codigo: "PAD10-WA",  canal: "whatsapp", computeDate: (dc) => addDays(dc, 10) },
  { codigo: "ENC14-WA",  canal: "whatsapp", computeDate: (dc) => addDays(dc, 14) },
  { codigo: "MEN1-WA",   canal: "whatsapp", computeDate: (_dc, d0) => addMonths(d0, 1) },
  { codigo: "MEN2-LIG",  canal: "ligacao",  computeDate: (_dc, d0) => addMonths(d0, 2) },
  { codigo: "MEN3-WA",   canal: "whatsapp", computeDate: (_dc, d0) => addMonths(d0, 3) },
  { codigo: "MEN6-WA",   canal: "whatsapp", computeDate: (_dc, d0) => addMonths(d0, 6) },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { meeting_id } = await req.json();
    if (!meeting_id) {
      return new Response(
        JSON.stringify({ error: "meeting_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("closer_id, primeiro_followup_em, inicio_em")
      .eq("id", meeting_id)
      .single();

    if (meetingError || !meeting) {
      return new Response(
        JSON.stringify({ error: "Meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!meeting.primeiro_followup_em) {
      return new Response(
        JSON.stringify({ error: "primeiro_followup_em not set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dc = meeting.primeiro_followup_em; // YYYY-MM-DD
    const d0 = toSaoPauloDate(meeting.inicio_em);
    const today = todayStr();

    const steps: Array<{
      meeting_id: string;
      closer_id: string;
      canal: string;
      data_prevista: string;
      status: string;
      codigo: string;
    }> = [];

    for (const step of CADENCE) {
      if (step.condition && !step.condition(dc, d0)) continue;
      const dataPrevista = step.computeDate(dc, d0);
      if (dataPrevista >= today) {
        steps.push({
          meeting_id,
          closer_id: meeting.closer_id,
          canal: step.canal,
          data_prevista: dataPrevista,
          status: "pendente",
          codigo: step.codigo,
        });
      }
    }

    if (steps.length > 0) {
      const { error: insertError } = await supabase
        .from("followup_steps")
        .upsert(steps, { onConflict: "meeting_id,codigo", ignoreDuplicates: true });

      if (insertError) {
        console.error("Error inserting followup steps:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create follow-up steps", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, steps_created: steps.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
