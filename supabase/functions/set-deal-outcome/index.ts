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

    // Auth client to verify user
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

    // Service role client for writes
    const db = createClient(supabaseUrl, serviceRoleKey);

    const { meeting_id, outcome, motivo } = await req.json();

    if (!meeting_id || !outcome) {
      return new Response(
        JSON.stringify({ error: "meeting_id and outcome required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["ganha", "perdida_simples", "perdida_definitiva"].includes(outcome)) {
      return new Response(
        JSON.stringify({ error: "Invalid outcome" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch meeting
    const { data: meeting, error: meetErr } = await db
      .from("meetings")
      .select("id, closer_id, inicio_em")
      .eq("id", meeting_id)
      .single();

    if (meetErr || !meeting) {
      return new Response(
        JSON.stringify({ error: "Meeting not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Permission check
    const { data: isAdminManager } = await db.rpc("is_admin_or_manager", {
      _user_id: userId,
    });
    if (!isAdminManager && meeting.closer_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let updatedSteps = 0;
    let createdMonthlySteps = 0;

    if (outcome === "ganha") {
      // Update meeting status — trigger handles followup cleanup
      const { error: upErr } = await db
        .from("meetings")
        .update({
          status: "ganha",
          fechado_em: new Date().toISOString(),
        })
        .eq("id", meeting_id);
      if (upErr) throw upErr;

      // Count affected steps
      const { count } = await db
        .from("followup_steps")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meeting_id)
        .eq("status", "ignorado")
        .not("notas", "is", null)
        .like("notas", "Deal ganho%");
      updatedSteps = count ?? 0;
    } else if (outcome === "perdida_definitiva") {
      const { error: upErr } = await db
        .from("meetings")
        .update({
          status: "perdida",
          perda_tipo: "definitiva",
          motivo_perda: motivo || null,
        })
        .eq("id", meeting_id);
      if (upErr) throw upErr;

      const { count } = await db
        .from("followup_steps")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meeting_id)
        .eq("status", "ignorado");
      updatedSteps = count ?? 0;
    } else if (outcome === "perdida_simples") {
      // Update meeting — trigger will close non-MEN* steps
      const { error: upErr } = await db
        .from("meetings")
        .update({
          status: "perdida",
          perda_tipo: "simples",
          motivo_perda: motivo || null,
        })
        .eq("id", meeting_id);
      if (upErr) throw upErr;

      // Generate monthly steps if missing
      const inicioEm = new Date(meeting.inicio_em);
      // D0 in SP timezone — use UTC date as approximation for date calc
      const d0 = new Date(
        inicioEm.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      );

      const monthlySteps = [
        { codigo: "MEN1-WA", canal: "whatsapp", monthOffset: 1 },
        { codigo: "MEN2-LIG", canal: "ligacao", monthOffset: 2 },
        { codigo: "MEN3-WA", canal: "whatsapp", monthOffset: 3 },
        { codigo: "MEN6-WA", canal: "whatsapp", monthOffset: 6 },
      ];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const step of monthlySteps) {
        const dataPrevista = new Date(d0);
        dataPrevista.setMonth(dataPrevista.getMonth() + step.monthOffset);
        const dpStr = dataPrevista.toISOString().slice(0, 10);

        if (dataPrevista >= today) {
          const { error: insErr } = await db.from("followup_steps").upsert(
            {
              meeting_id,
              closer_id: meeting.closer_id,
              codigo: step.codigo,
              canal: step.canal,
              data_prevista: dpStr,
              status: "pendente",
            },
            { onConflict: "meeting_id,codigo", ignoreDuplicates: true }
          );
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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("set-deal-outcome error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
