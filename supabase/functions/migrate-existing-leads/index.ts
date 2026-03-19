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
  return new Date(isoString).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
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

interface MigrationItem {
  meeting_id: string;
  primeiro_followup_em: string;
}

interface MeetingResult {
  meeting_id: string;
  lead_name: string | null;
  steps_gerados: string[];
  steps_ignorados: string[];
  alerta_fase_mensal: boolean;
}

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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role via core_users
    const { data: adminUser, error: roleError } = await serviceClient
      .from("core_users")
      .select("cargo")
      .eq("id", user.id)
      .eq("cargo", "admin")
      .maybeSingle();

    if (roleError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { items } = (await req.json()) as { items: MigrationItem[] };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "items array is required and must not be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = todayStr();
    const results: MeetingResult[] = [];
    let totalStepsGerados = 0;
    let totalStepsIgnorados = 0;

    for (const item of items) {
      const { meeting_id, primeiro_followup_em } = item;

      const { data: meeting, error: meetingErr } = await serviceClient
        .from("crm_meetings")
        .select("id, status, closer_id, nome_lead, data_reuniao")
        .eq("id", meeting_id)
        .single();

      if (meetingErr || !meeting) {
        results.push({ meeting_id, lead_name: null, steps_gerados: [], steps_ignorados: [], alerta_fase_mensal: false });
        continue;
      }

      if (meeting.status !== "proposta_enviada") {
        results.push({ meeting_id, lead_name: meeting.nome_lead, steps_gerados: [], steps_ignorados: [`status_invalido:${meeting.status}`], alerta_fase_mensal: false });
        continue;
      }

      // Update data_proposta as the follow-up start reference
      await serviceClient.from("crm_meetings").update({ data_proposta: primeiro_followup_em }).eq("id", meeting_id);

      const dc = primeiro_followup_em;
      const d0 = toSaoPauloDate(meeting.data_reuniao);
      const stepsGerados: string[] = [];
      const stepsIgnorados: string[] = [];
      const stepsToInsert: Array<{
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
        if (step.condition && !step.condition(dc, d0)) {
          stepsIgnorados.push(`${step.step_nome}:condicao`);
          continue;
        }
        const dataProgramada = step.computeDate(dc, d0);
        if (dataProgramada >= today) {
          stepsToInsert.push({
            meeting_id,
            responsavel_id: meeting.closer_id,
            canal_entrega: step.canal === "whatsapp" ? "texto" : "texto",
            data_programada: dataProgramada,
            status: "pendente",
            step_nome: step.step_nome,
            step_ordem: ordem++,
          });
          stepsGerados.push(step.step_nome);
        } else {
          stepsIgnorados.push(step.step_nome);
        }
      }

      if (stepsToInsert.length > 0) {
        const { error: insertErr } = await serviceClient
          .from("crm_followup_steps")
          .insert(stepsToInsert);
        if (insertErr) {
          console.error(`Error inserting steps for meeting ${meeting_id}:`, insertErr);
        }
      }

      const alertaFaseMensal = diffDays(primeiro_followup_em, today) > 14;
      totalStepsGerados += stepsGerados.length;
      totalStepsIgnorados += stepsIgnorados.length;

      results.push({ meeting_id, lead_name: meeting.nome_lead, steps_gerados: stepsGerados, steps_ignorados: stepsIgnorados, alerta_fase_mensal: alertaFaseMensal });
    }

    return new Response(
      JSON.stringify({ results, totals: { total_meetings: results.length, total_steps_gerados: totalStepsGerados, total_steps_ignorados: totalStepsIgnorados } }),
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
