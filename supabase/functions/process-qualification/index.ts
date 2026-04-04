import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QualificationData {
  pais_nascimento?: string;
  tempo_residencia_brasil_anos?: number;
  servico_interesse?: string;
  rnm_classificacao?: string;
  rnm_data_vencimento?: string;
  casado_conjuge_brasileiro?: boolean;
  possui_filhos_brasileiros?: boolean;
  possui_pais_brasileiros?: boolean;
  pais_lingua_portuguesa?: boolean;
  possui_certificado_portugues?: boolean;
}

function parseQualificationBlock(text: string): QualificationData | null {
  const match = text.match(/\[QUALIFICACAO_COMPLETA\]([\s\S]*?)\[\/QUALIFICACAO_COMPLETA\]/);
  if (!match) return null;

  const block = match[1];
  const data: QualificationData = {};

  const lines = block.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const [key, value] = line.split(':').map(s => s.trim());
    if (!key || !value || value === 'null') continue;

    switch (key) {
      case 'pais_nascimento':
        data.pais_nascimento = value;
        break;
      case 'tempo_residencia_brasil_anos':
        data.tempo_residencia_brasil_anos = parseInt(value) || 0;
        break;
      case 'servico_interesse':
        if (['autorizacao_residencia', 'naturalizacao_brasileira', 'outro_servico_migratorio'].includes(value)) {
          data.servico_interesse = value;
        }
        break;
      case 'rnm_classificacao':
        if (['temporario', 'indeterminado', 'nao_possui'].includes(value)) {
          data.rnm_classificacao = value;
        }
        break;
      case 'rnm_data_vencimento':
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          data.rnm_data_vencimento = value;
        }
        break;
      case 'casado_conjuge_brasileiro':
        data.casado_conjuge_brasileiro = value === 'true';
        break;
      case 'possui_filhos_brasileiros':
        data.possui_filhos_brasileiros = value === 'true';
        break;
      case 'possui_pais_brasileiros':
        data.possui_pais_brasileiros = value === 'true';
        break;
      case 'pais_lingua_portuguesa':
        data.pais_lingua_portuguesa = value === 'true';
        break;
      case 'possui_certificado_portugues':
        data.possui_certificado_portugues = value === 'true';
        break;
    }
  }

  return Object.keys(data).length > 0 ? data : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { message_content, contact_id, lead_id, conversation_id } = await req.json();

    if (!message_content) {
      return new Response(
        JSON.stringify({ processed: false, reason: "no_content" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tentar extrair dados de qualificação
    const qualificationData = parseQualificationBlock(message_content);

    if (!qualificationData) {
      return new Response(
        JSON.stringify({ processed: false, reason: "no_qualification_block" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se tiver lead_id, atualizar diretamente
    if (lead_id) {
      const { error } = await supabase
        .from("crm_leads")
        .update(qualificationData)
        .eq("id", lead_id);

      if (error) throw error;

      // Buscar score atualizado
      const { data: updatedLead } = await supabase
        .from("crm_leads")
        .select("score_qualificacao, nome")
        .eq("id", lead_id)
        .single();

      return new Response(
        JSON.stringify({ 
          processed: true, 
          lead_id,
          score: updatedLead?.score_qualificacao,
          data: qualificationData 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se tiver contact_id, buscar lead vinculado
    if (contact_id) {
      const { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("lead_id")
        .eq("id", contact_id)
        .single();

      if (contact?.lead_id) {
        const { error } = await supabase
          .from("crm_leads")
          .update(qualificationData)
          .eq("id", contact.lead_id);

        if (error) throw error;

        const { data: updatedLead } = await supabase
          .from("crm_leads")
          .select("score_qualificacao, nome")
          .eq("id", contact.lead_id)
          .single();

        return new Response(
          JSON.stringify({ 
            processed: true, 
            lead_id: contact.lead_id,
            score: updatedLead?.score_qualificacao,
            data: qualificationData 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Log para processar depois (lead ainda não vinculado)
    await supabase.from("ai_agent_logs").insert({
      agent_id: null,
      conversation_id,
      action: "qualification_extracted",
      input: message_content,
      output: qualificationData,
      metadata: { contact_id, pending_lead_link: true },
    });

    return new Response(
      JSON.stringify({ 
        processed: true, 
        pending_lead_link: true,
        data: qualificationData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
