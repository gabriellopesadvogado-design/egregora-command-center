import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Meeting {
  id: string;
  data_reuniao: string;
  sdr_id: string;
  closer_id: string;
  nome_lead: string;
}

type NotificationTipo = "lembrete_sdr" | "lembrete_closer_5min" | "lembrete_closer_agora";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const nowMinus1 = new Date(now.getTime() - 1 * 60 * 1000);
    const nowPlus1 = new Date(now.getTime() + 1 * 60 * 1000);
    const nowPlus4 = new Date(now.getTime() + 4 * 60 * 1000);
    const nowPlus6 = new Date(now.getTime() + 6 * 60 * 1000);
    const nowPlus29 = new Date(now.getTime() + 29 * 60 * 1000);
    const nowPlus31 = new Date(now.getTime() + 31 * 60 * 1000);

    // Fetch meetings in the relevant time windows
    const { data: meetings, error: meetingsError } = await supabase
      .from("crm_meetings")
      .select("id, data_reuniao, sdr_id, closer_id, nome_lead")
      .eq("status", "reuniao_agendada")
      .gte("data_reuniao", nowMinus1.toISOString())
      .lte("data_reuniao", nowPlus31.toISOString());

    if (meetingsError) {
      throw new Error(`Error fetching meetings: ${meetingsError.message}`);
    }

    const notificationsToCreate: {
      user_id: string;
      tipo: NotificationTipo;
      titulo: string;
      mensagem: string;
      modulo_origem: string;
      link: string;
    }[] = [];

    for (const meeting of (meetings || []) as Meeting[]) {
      const dataReuniao = new Date(meeting.data_reuniao);
      const leadNome = meeting.nome_lead || "Lead";

      // Check SDR 30min window
      if (dataReuniao >= nowPlus29 && dataReuniao <= nowPlus31) {
        notificationsToCreate.push({
          user_id: meeting.sdr_id,
          tipo: "lembrete_sdr",
          titulo: "Reunião em 30 minutos",
          mensagem: `Sua reunião com ${leadNome} começa em 30 minutos.`,
          modulo_origem: "crm",
          link: `/vendas`,
        });
      }

      // Check Closer 5min window
      if (dataReuniao >= nowPlus4 && dataReuniao <= nowPlus6) {
        notificationsToCreate.push({
          user_id: meeting.closer_id,
          tipo: "lembrete_closer_5min",
          titulo: "Reunião em 5 minutos",
          mensagem: `Sua reunião com ${leadNome} começa em 5 minutos. Prepare-se!`,
          modulo_origem: "crm",
          link: `/vendas`,
        });
      }

      // Check Closer now window
      if (dataReuniao >= nowMinus1 && dataReuniao <= nowPlus1) {
        notificationsToCreate.push({
          user_id: meeting.closer_id,
          tipo: "lembrete_closer_agora",
          titulo: "Reunião começando agora!",
          mensagem: `Sua reunião com ${leadNome} está começando AGORA!`,
          modulo_origem: "crm",
          link: `/vendas`,
        });
      }
    }

    const insertedNotifications: string[] = [];

    for (const notif of notificationsToCreate) {
      // Check for existing notification to avoid duplicates
      const { data: existing } = await supabase
        .from("core_notifications")
        .select("id")
        .eq("user_id", notif.user_id)
        .eq("tipo", notif.tipo)
        .eq("titulo", notif.titulo)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("core_notifications")
          .insert(notif);

        if (!insertError) {
          insertedNotifications.push(`${notif.tipo} for user ${notif.user_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        meetingsChecked: meetings?.length || 0,
        notificationsCreated: insertedNotifications.length,
        details: insertedNotifications,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-meeting-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
