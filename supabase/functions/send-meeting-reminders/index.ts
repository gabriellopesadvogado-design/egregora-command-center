import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MeetingLead {
  nome: string;
}

interface Meeting {
  id: string;
  inicio_em: string;
  sdr_id: string;
  closer_id: string;
  leads: MeetingLead | MeetingLead[] | null;
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
      .from("meetings")
      .select("id, inicio_em, sdr_id, closer_id, leads(nome)")
      .eq("status", "agendada")
      .gte("inicio_em", nowMinus1.toISOString())
      .lte("inicio_em", nowPlus31.toISOString());

    if (meetingsError) {
      throw new Error(`Error fetching meetings: ${meetingsError.message}`);
    }

    const notificationsToCreate: {
      user_id: string;
      meeting_id: string;
      tipo: NotificationTipo;
      titulo: string;
      mensagem: string;
    }[] = [];

    for (const meeting of (meetings || []) as Meeting[]) {
      const inicioEm = new Date(meeting.inicio_em);
      const leads = meeting.leads;
      const leadNome = Array.isArray(leads) ? leads[0]?.nome : leads?.nome || "Lead";

      // Check SDR 30min window (29-31 min before)
      if (inicioEm >= nowPlus29 && inicioEm <= nowPlus31) {
        notificationsToCreate.push({
          user_id: meeting.sdr_id,
          meeting_id: meeting.id,
          tipo: "lembrete_sdr",
          titulo: "Reunião em 30 minutos",
          mensagem: `Sua reunião com ${leadNome} começa em 30 minutos.`,
        });
      }

      // Check Closer 5min window (4-6 min before)
      if (inicioEm >= nowPlus4 && inicioEm <= nowPlus6) {
        notificationsToCreate.push({
          user_id: meeting.closer_id,
          meeting_id: meeting.id,
          tipo: "lembrete_closer_5min",
          titulo: "Reunião em 5 minutos",
          mensagem: `Sua reunião com ${leadNome} começa em 5 minutos. Prepare-se!`,
        });
      }

      // Check Closer now window (-1 to +1 min)
      if (inicioEm >= nowMinus1 && inicioEm <= nowPlus1) {
        notificationsToCreate.push({
          user_id: meeting.closer_id,
          meeting_id: meeting.id,
          tipo: "lembrete_closer_agora",
          titulo: "Reunião começando agora!",
          mensagem: `Sua reunião com ${leadNome} está começando AGORA!`,
        });
      }
    }

    // Filter out duplicates - check if notification already exists
    const insertedNotifications: string[] = [];

    for (const notif of notificationsToCreate) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("meeting_id", notif.meeting_id)
        .eq("tipo", notif.tipo)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(notif);

        if (!insertError) {
          insertedNotifications.push(`${notif.tipo} for meeting ${notif.meeting_id}`);
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
