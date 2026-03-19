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

    const { meeting_id, canal, data_prevista, horario, notas, pause_default, step_id } =
      await req.json();

    if (!meeting_id || !canal || !data_prevista) {
      return new Response(
        JSON.stringify({ error: "meeting_id, canal, and data_prevista required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["whatsapp", "ligacao"].includes(canal)) {
      return new Response(
        JSON.stringify({ error: "Invalid canal" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch meeting
    const { data: meeting, error: meetErr } = await db
      .from("meetings")
      .select("id, closer_id")
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

    // Mark origin step as done if provided
    if (step_id) {
      const { data: origStep } = await db
        .from("followup_steps")
        .select("notas")
        .eq("id", step_id)
        .single();
      const existingNotas = origStep?.notas || "";
      const updatedNotas = existingNotas
        ? `${existingNotas} | Concluído via reagendamento`
        : "Concluído via reagendamento";
      await db
        .from("followup_steps")
        .update({
          status: "feito",
          executado_em: new Date().toISOString(),
          notas: updatedNotas,
        })
        .eq("id", step_id);
    }

    let pausedSteps = 0;

    // Pause default cadence if requested
    if (pause_default !== false) {
      const { data: paused } = await db
        .from("followup_steps")
        .update({
          status: "ignorado",
          notas: "Cadência padrão pausada por reagendamento manual",
        })
        .eq("meeting_id", meeting_id)
        .eq("tipo", "padrao")
        .eq("status", "pendente")
        .gte("data_prevista", new Date().toISOString().slice(0, 10))
        .select("id");

      pausedSteps = paused?.length ?? 0;
    }

    // Build notas for manual step
    const notasParts: string[] = [];
    if (horario) notasParts.push(`Horário: ${horario}`);
    if (notas) notasParts.push(notas);
    const fullNotas = notasParts.length > 0 ? notasParts.join(" | ") : null;

    // Generate short unique code for manual step
    const shortId = crypto.randomUUID().slice(0, 8).toUpperCase();

    const { data: created, error: insErr } = await db
      .from("followup_steps")
      .insert({
        meeting_id,
        closer_id: meeting.closer_id,
        tipo: "manual",
        codigo: `MANUAL-${shortId}`,
        manual_titulo: "Reagendado pelo lead",
        canal,
        data_prevista,
        status: "pendente",
        notas: fullNotas,
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        success: true,
        meeting_id,
        paused_steps: pausedSteps,
        created_manual_step_id: created.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("reschedule-followup error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
