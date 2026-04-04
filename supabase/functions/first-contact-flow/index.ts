import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";
const ZAPI_URL = "https://api.z-api.io";

interface FirstContactRecord {
  id: string;
  lead_id: string;
  telefone: string;
  nome: string;
  status: string;
  check_after: string;
  template_sent_at: string | null;
  template_error: string | null;
  zapi_sent_at: string | null;
  sdr_instance_id: string | null;
  attempts: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const results = {
      processed: 0,
      template_sent: 0,
      zapi_sent: 0,
      lead_responded: 0,
      errors: [] as string[],
    };

    // 1. PROCESSAR LEADS AGUARDANDO (após 5 min, verificar se respondeu e enviar template)
    const { data: aguardando } = await supabase
      .from("lead_first_contact")
      .select("*")
      .eq("status", "aguardando")
      .lte("check_after", new Date().toISOString())
      .limit(20);

    for (const record of aguardando || []) {
      results.processed++;
      
      // Verificar se lead já mandou mensagem
      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("phone_number", record.telefone)
        .eq("direction", "incoming")
        .gte("created_at", record.created_at)
        .limit(1);

      if (messages && messages.length > 0) {
        // Lead já respondeu - não precisa enviar nada
        await supabase
          .from("lead_first_contact")
          .update({ status: "lead_respondeu" })
          .eq("id", record.id);
        results.lead_responded++;
        continue;
      }

      // Lead não respondeu - enviar template via API Oficial
      const templateResult = await sendOfficialTemplate(supabase, record);
      
      if (templateResult.success) {
        await supabase
          .from("lead_first_contact")
          .update({ 
            status: "template_enviado",
            template_sent_at: new Date().toISOString(),
          })
          .eq("id", record.id);
        results.template_sent++;
      } else {
        // Template falhou - agendar fallback via Z-API
        await supabase
          .from("lead_first_contact")
          .update({ 
            status: "template_erro",
            template_error: templateResult.error,
            check_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 min
          })
          .eq("id", record.id);
        results.errors.push(`Template falhou para ${record.telefone}: ${templateResult.error}`);
      }
    }

    // 2. PROCESSAR FALLBACK (template_erro após 5 min → enviar via Z-API do SDR)
    const { data: templateErro } = await supabase
      .from("lead_first_contact")
      .select("*")
      .eq("status", "template_erro")
      .lte("check_after", new Date().toISOString())
      .limit(20);

    for (const record of templateErro || []) {
      results.processed++;

      // Verificar se lead já mandou mensagem (pode ter respondido depois)
      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("phone_number", record.telefone)
        .eq("direction", "incoming")
        .gte("created_at", record.created_at)
        .limit(1);

      if (messages && messages.length > 0) {
        await supabase
          .from("lead_first_contact")
          .update({ status: "lead_respondeu" })
          .eq("id", record.id);
        results.lead_responded++;
        continue;
      }

      // Enviar via Z-API do SDR Hugo
      const zapiResult = await sendViaZapi(supabase, record);
      
      if (zapiResult.success) {
        await supabase
          .from("lead_first_contact")
          .update({ 
            status: "zapi_enviado",
            zapi_sent_at: new Date().toISOString(),
            sdr_instance_id: zapiResult.instance_id,
          })
          .eq("id", record.id);
        results.zapi_sent++;
      } else {
        await supabase
          .from("lead_first_contact")
          .update({ 
            status: "erro_final",
            zapi_error: zapiResult.error,
            attempts: record.attempts + 1,
          })
          .eq("id", record.id);
        results.errors.push(`Z-API falhou para ${record.telefone}: ${zapiResult.error}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in first-contact-flow:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Enviar template via API Oficial do Meta
async function sendOfficialTemplate(
  supabase: any, 
  record: FirstContactRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar credenciais da API oficial
    const { data: cred } = await supabase
      .from("api_credentials")
      .select("value_encrypted, metadata")
      .eq("provider", "meta")
      .ilike("label", "%WhatsApp%")
      .single();

    if (!cred) {
      return { success: false, error: "Credenciais Meta não encontradas" };
    }

    const phoneNumberId = cred.metadata?.phone_number_id;
    if (!phoneNumberId) {
      return { success: false, error: "Phone Number ID não configurado" };
    }

    // Formatar telefone (remover caracteres especiais, garantir formato internacional)
    const phone = record.telefone.replace(/\D/g, "");
    const firstName = (record.nome || "").split(" ")[0] || "Olá";

    // Enviar template
    const response = await fetch(
      `${META_GRAPH_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cred.value_encrypted}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: "primeiro_contato",
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: firstName }
                ]
              }
            ]
          }
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Enviar mensagem via Z-API do SDR
async function sendViaZapi(
  supabase: any,
  record: FirstContactRecord
): Promise<{ success: boolean; error?: string; instance_id?: string }> {
  try {
    // Buscar hubspot_owner_id do lead para saber qual SDR está atribuído
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("hubspot_owner_id")
      .eq("id", record.lead_id)
      .single();

    const ownerId = lead?.hubspot_owner_id;

    // Buscar instância do SDR atribuído, ou primeiro SDR disponível como fallback
    let instanceQuery = supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("tipo", "sdr")
      .eq("is_connected", true)
      .eq("provider", "zapi")
      .not("zapi_instance_id", "is", null);

    // Se tem owner_id, priorizar o SDR correspondente
    if (ownerId) {
      instanceQuery = instanceQuery.eq("hubspot_owner_id", ownerId);
    }

    const { data: instance } = await instanceQuery.limit(1).single();
    
    // Se não encontrou SDR específico, tentar qualquer SDR disponível
    if (!instance && ownerId) {
      const { data: fallbackInstance } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("tipo", "sdr")
        .eq("is_connected", true)
        .eq("provider", "zapi")
        .not("zapi_instance_id", "is", null)
        .limit(1)
        .single();
      
      if (fallbackInstance) {
        return await sendZapiMessage(fallbackInstance, record);
      }
    }

    if (!instance) {
      return { success: false, error: "Nenhuma instância Z-API de SDR disponível" };
    }

    return await sendZapiMessage(instance, record);

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Função auxiliar para enviar mensagem via Z-API
async function sendZapiMessage(
  instance: any,
  record: FirstContactRecord
): Promise<{ success: boolean; error?: string; instance_id?: string }> {
  const phone = record.telefone.replace(/\D/g, "");
  const firstName = (record.nome || "").split(" ")[0] || "Olá";
  
  // Mensagem de texto simples (não é template)
  const message = `Olá, ${firstName}! 👋 Vi que você demonstrou interesse nos nossos serviços de assessoria em imigração. Sou da equipe Egrégora e gostaria de entender melhor como posso te ajudar. Você tem alguns minutos para conversarmos?`;

  // Enviar via Z-API
  const response = await fetch(
    `${ZAPI_URL}/instances/${instance.zapi_instance_id}/token/${instance.zapi_token}/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": instance.zapi_client_token || "",
      },
      body: JSON.stringify({
        phone: phone,
        message: message,
      }),
    }
  );

  const data = await response.json();
  
  if (data.error || data.zapiError) {
    return { success: false, error: data.error || data.zapiError || "Erro Z-API" };
  }

  return { success: true, instance_id: instance.id };
}
