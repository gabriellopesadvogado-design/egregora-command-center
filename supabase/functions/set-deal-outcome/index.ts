import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } =
      await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const db = createClient(supabaseUrl, serviceRoleKey);

    const { meeting_id, outcome, motivo } = await req.json();

    if (!meeting_id || !outcome) {
      return new Response(
        JSON.stringify({ error: "meeting_id and outcome required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["fechado", "perdido", "perdido_simples"].includes(outcome)) {
      return new Response(
        JSON.stringify({ error: "Invalid outcome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch meeting
    const { data: meeting, error: meetErr } = await db
      .from("crm_meetings")
      .select("id, closer_id, sdr_id, data_reuniao")
      .eq("id", meeting_id)
      .single();

    if (meetErr || !meeting) {
      return new Response(
        JSON.stringify({ error: "Meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Permission check
    const { data: isAdminManager } = await db.rpc("is_admin_or_gestor", {
      _user_id: userId,
    });
    if (!isAdminManager && meeting.closer_id !== userId && meeting.sdr_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updatedSteps = 0;
    let createdMonthlySteps = 0;

    if (outcome === "fechado") {
      const { error: upErr } = await db
        .from("crm_meetings")
        .update({
          status: "fechado",
          data_fechamento: new Date().toISOString(),
        })
        .eq("id", meeting_id);
      if (upErr) throw upErr;

      // Cancel pending followups
      const { data: cancelled } = await db
        .from("crm_followup_steps")
        .update({
          status: "cancelado",
          notas: "Deal fechado — followup cancelado",
        })
        .eq("meeting_id", meeting_id)
        .eq("status", "pendente")
        .select("id");
      updatedSteps = cancelled?.length ?? 0;

    } else if (outcome === "perdido") {
      const { error: upErr } = await db
        .from("crm_meetings")
        .update({
          status: "perdido",
          motivo_perda: motivo || null,
        })
        .eq("id", meeting_id);
      if (upErr) throw upErr;

      // Cancel all pending followups
      const { data: cancelled } = await db
        .from("crm_followup_steps")
        .update({
          status: "cancelado",
          notas: "Deal perdido — followup cancelado",
        })
        .eq("meeting_id", meeting_id)
        .eq("status", "pendente")
        .select("id");
      updatedSteps = cancelled?.length ?? 0;

    } else if (outcome === "perdido_simples") {
      const { error: upErr } = await db
        .from("crm_meetings")
        .update({
          status: "perdido",
          motivo_perda: motivo || null,
        })
        .eq("id", meeting_id);
      if (upErr) throw upErr;

      // Cancel non-monthly pending followups, keep MEN* ones
      const { data: cancelled } = await db
        .from("crm_followup_steps")
        .update({
          status: "cancelado",
          notas: "Perdido simples — cadência curta cancelada",
        })
        .eq("meeting_id", meeting_id)
        .eq("status", "pendente")
        .not("step_nome", "like", "MEN%")
        .select("id");
      updatedSteps = cancelled?.length ?? 0;

      // Generate monthly steps if missing
      const dataReuniao = new Date(meeting.data_reuniao);
      const d0 = new Date(
        dataReuniao.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      );

      const monthlySteps = [
        { step_nome: "MEN1-WA", monthOffset: 1 },
        { step_nome: "MEN2-LIG", monthOffset: 2 },
        { step_nome: "MEN3-WA", monthOffset: 3 },
        { step_nome: "MEN6-WA", monthOffset: 6 },
      ];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const step of monthlySteps) {
        const dataProgramada = new Date(d0);
        dataProgramada.setMonth(dataProgramada.getMonth() + step.monthOffset);
        const dpStr = dataProgramada.toISOString().slice(0, 10);

        if (dataProgramada >= today) {
          const { error: insErr } = await db.from("crm_followup_steps").insert({
            meeting_id,
            responsavel_id: meeting.closer_id,
            step_nome: step.step_nome,
            step_ordem: step.monthOffset * 10,
            canal_entrega: "texto",
            data_programada: dpStr,
            status: "pendente",
          });
          if (!insErr) createdMonthlySteps++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        meeting_id,
        updated_steps: updatedSteps,
        created_monthly_steps: createdMonthlySteps,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("set-deal-outcome error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
