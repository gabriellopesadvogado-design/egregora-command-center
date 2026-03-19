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
  return parts;
};

const todayStr = (): string => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
};

interface CadenceStep {
  step_nome: string;
  canal: "whatsapp" | "ligacao";
  computeDate: (dc: string, d0: string) => string;
  condition?: (dc: string, d0: string) => boolean;
}

const CADENCE: CadenceStep[] = [
  { step_nome: "POS-WA",    canal: "whatsapp", computeDate: (_dc, d0) => d0 },
  { step_nome: "CONF-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, -1), condition: (dc, d0) => diffDays(d0, dc) >= 2 },
  { step_nome: "DC-LIG",    canal: "ligacao",  computeDate: (dc) => dc },
  { step_nome: "DC-WA",     canal: "whatsapp", computeDate: (dc) => dc },
  { step_nome: "BAT1-LIG",  canal: "ligacao",  computeDate: (dc) => addDays(dc, 1) },
  { step_nome: "BAT1-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, 1) },
  { step_nome: "BAT2-LIG",  canal: "ligacao",  computeDate: (dc) => addDays(dc, 2) },
  { step_nome: "BAT2-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, 2) },
  { step_nome: "BAT3-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, 3) },
  { step_nome: "PAD6-WA",   canal: "whatsapp", computeDate: (dc) => addDays(dc, 6) },
  { step_nome: "PAD10-WA",  canal: "whatsapp", computeDate: (dc) => addDays(dc, 10) },
  { step_nome: "ENC14-WA",  canal: "whatsapp", computeDate: (dc) => addDays(dc, 14) },
  { step_nome: "MEN1-WA",   canal: "whatsapp", computeDate: (_dc, d0) => addMonths(d0, 1) },
  { step_nome: "MEN2-LIG",  canal: "ligacao",  computeDate: (_dc, d0) => addMonths(d0, 2) },
  { step_nome: "MEN3-WA",   canal: "whatsapp", computeDate: (_dc, d0) => addMonths(d0, 3) },
  { step_nome: "MEN6-WA",   canal: "whatsapp", computeDate: (_dc, d0) => addMonths(d0, 6) },
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
      .from("crm_meetings")
      .select("closer_id, data_reuniao, data_proposta")
      .eq("id", meeting_id)
      .single();

    if (meetingError || !meeting) {
      return new Response(
        JSON.stringify({ error: "Meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use data_proposta as the follow-up start date, fallback to today
    const dc = meeting.data_proposta
      ? toSaoPauloDate(meeting.data_proposta)
      : todayStr();
    const d0 = meeting.data_reuniao
      ? toSaoPauloDate(meeting.data_reuniao)
      : todayStr();
    const today = todayStr();

    const steps: Array<{
      meeting_id: string;
      responsavel_id: string;
      canal_entrega: string;
      data_programada: string;
      status: string;
      step_nome: string;
      step_ordem: number;
    }> = [];

    let ordem = 1;
    for (const step of CADENCE) {
      if (step.condition && !step.condition(dc, d0)) continue;
      const dataProgramada = step.computeDate(dc, d0);
      if (dataProgramada >= today) {
        steps.push({
          meeting_id,
          responsavel_id: meeting.closer_id,
          canal_entrega: step.canal === "whatsapp" ? "texto" : "texto",
          data_programada: dataProgramada,
          status: "pendente",
          step_nome: step.step_nome,
          step_ordem: ordem++,
        });
      }
    }

    if (steps.length > 0) {
      const { error: insertError } = await supabase
        .from("crm_followup_steps")
        .insert(steps);

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
