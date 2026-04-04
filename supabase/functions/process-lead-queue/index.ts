import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Meta WhatsApp API
const META_API_URL = 'https://graph.facebook.com/v18.0';

interface QueueItem {
  id: string;
  phone_number: string;
  lead_name: string;
  status: string;
  wait_until: string;
  template_attempts: number;
  sdr_instance_id: string;
}

// Enviar template via API Oficial (Meta)
async function sendTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  variables: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(
      `${META_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'pt_BR' },
            components: variables.length > 0 ? [
              {
                type: 'body',
                parameters: variables.map(v => ({ type: 'text', text: v }))
              }
            ] : undefined
          }
        }),
      }
    );

    const data = await response.json();
    
    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    
    return { 
      success: false, 
      error: data.error?.message || 'Unknown error' 
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Enviar mensagem via Z-API (fallback SDR)
async function sendZAPIMessage(
  instanceId: string,
  token: string,
  clientToken: string,
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': clientToken,
        },
        body: JSON.stringify({ phone, message }),
      }
    );

    const data = await response.json();
    
    if (data.messageId) {
      return { success: true, messageId: data.messageId };
    }
    
    return { success: false, error: data.error || 'Unknown error' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[process-lead-queue] Starting...');

    // Buscar configurações da API oficial
    const { data: metaConfig } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('provider', 'meta')
      .eq('credential_type', 'access_token')
      .eq('is_valid', true)
      .single();

    if (!metaConfig) {
      console.log('[process-lead-queue] Meta API not configured');
    } else {
      console.log('[process-lead-queue] Meta API found:', metaConfig.label);
    }

    // Buscar template ativo
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'approved')
      .limit(1)
      .single();
    
    if (!template) {
      console.log('[process-lead-queue] No approved template found');
    } else {
      console.log('[process-lead-queue] Template found:', template.name);
    }

    // 1. Processar leads aguardando (5 min passaram, não chamaram)
    const { data: waitingLeads, error: waitingError } = await supabase
      .from('lead_automation_queue')
      .select('*')
      .eq('status', 'waiting')
      .lte('wait_until', new Date().toISOString())
      .limit(10);

    if (waitingError) {
      console.error('[process-lead-queue] Error fetching waiting leads:', waitingError);
    }

    let processed = 0;
    let errors = 0;

    for (const lead of (waitingLeads || [])) {
      console.log('[process-lead-queue] Processing lead:', lead.phone_number);

      // Verificar se lead já respondeu
      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('contact_id', lead.contact_id)
        .eq('message_from', 'user')
        .gte('sent_at', lead.created_at)
        .limit(1);

      if (messages && messages.length > 0) {
        // Lead já respondeu, atualizar status
        await supabase
          .from('lead_automation_queue')
          .update({
            status: 'qualifying',
            first_response_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        await supabase.from('lead_automation_log').insert({
          queue_id: lead.id,
          action: 'lead_responded_before_template',
          details: { message_found: true },
        });

        processed++;
        continue;
      }

      // Tentar enviar template via API oficial
      if (metaConfig && template) {
        const phoneNumberId = metaConfig.metadata?.phone_number_id;
        const accessToken = metaConfig.value_encrypted;

        if (phoneNumberId && accessToken) {
          const variables = [lead.lead_name || 'Cliente'];
          const result = await sendTemplate(
            phoneNumberId,
            accessToken,
            lead.phone_number,
            template.template_id,
            variables
          );

          if (result.success) {
            await supabase
              .from('lead_automation_queue')
              .update({
                status: 'waiting_response',
                template_sent_at: new Date().toISOString(),
                template_attempts: lead.template_attempts + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', lead.id);

            // Atualizar instance_id da conversa para a instância da API Oficial
            const { data: metaInstance } = await supabase
              .from('whatsapp_instances')
              .select('id')
              .eq('provider', 'meta')
              .eq('is_active', true)
              .single();

            if (metaInstance && lead.contact_id) {
              await supabase
                .from('whatsapp_conversations')
                .update({ instance_id: metaInstance.id })
                .eq('contact_id', lead.contact_id);
            }

            await supabase.from('lead_automation_log').insert({
              queue_id: lead.id,
              action: 'template_sent',
              details: { messageId: result.messageId, template: template.template_id },
            });

            processed++;
            continue;
          } else {
            // Erro no template, fazer fallback para SDR
            console.log('[process-lead-queue] Template error, falling back to SDR:', result.error);

            await supabase.from('lead_automation_log').insert({
              queue_id: lead.id,
              action: 'template_error',
              details: { error: result.error },
            });
          }
        }
      }

      // Fallback: enviar via Z-API do SDR
      if (lead.sdr_instance_id) {
        const { data: sdrInstance } = await supabase
          .from('whatsapp_instances')
          .select('*, user:user_id(nome)')
          .eq('id', lead.sdr_instance_id)
          .single();

        if (sdrInstance?.zapi_instance_id && sdrInstance?.zapi_token && sdrInstance?.zapi_client_token) {
          // Extrair primeiro nome do SDR
          const sdrFullName = (sdrInstance.user as any)?.nome || 'Atendente';
          const sdrFirstName = sdrFullName.split(' ')[0];
          
          // Mensagem personalizada com nome do SDR
          const fallbackMessage = `Olá${lead.lead_name ? `, ${lead.lead_name}` : ''}! Eu sou o ${sdrFirstName}, faço parte da equipe da Egrégora e serei o responsável pelo seu atendimento. Como posso te ajudar? 😊`;
          
          const result = await sendZAPIMessage(
            sdrInstance.zapi_instance_id,
            sdrInstance.zapi_token,
            sdrInstance.zapi_client_token,
            lead.phone_number,
            fallbackMessage
          );

          if (result.success) {
            await supabase
              .from('lead_automation_queue')
              .update({
                status: 'fallback_sdr',
                template_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', lead.id);

            await supabase.from('lead_automation_log').insert({
              queue_id: lead.id,
              action: 'fallback_sdr_sent',
              details: { messageId: result.messageId, instance: sdrInstance.nome },
            });

            processed++;
          } else {
            await supabase
              .from('lead_automation_queue')
              .update({
                status: 'error',
                last_error: result.error,
                updated_at: new Date().toISOString(),
              })
              .eq('id', lead.id);

            errors++;
          }
        }
      }
    }

    console.log(`[process-lead-queue] Done. Processed: ${processed}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ success: true, processed, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-lead-queue] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
