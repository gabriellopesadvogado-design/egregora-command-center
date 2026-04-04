import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DealWebhookPayload {
  // HubSpot workflow format
  objectId?: number;
  properties?: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    hs_lastmodifieddate?: string;
    pipeline?: string;
  };
  associations?: {
    contacts?: number[];
  };
  // Manual/direct format
  deal_id?: string;
  deal_name?: string;
  deal_stage?: string;
  deal_value?: number;
  close_date?: string;
  is_won?: boolean;
  contact_id?: string;
  phone?: string;
}

// Mapeamento de stages do HubSpot para status interno
// Pipeline Egrégora (836815394) - o principal
const STAGE_MAP: Record<string, { stage: string; isWon: boolean; isClosed: boolean }> = {
  // Pipeline Egrégora
  '1242702152': { stage: 'Novo Lead', isWon: false, isClosed: false },
  '1242702153': { stage: 'Qualificação Inicial', isWon: false, isClosed: false },
  '1329916949': { stage: 'Tentativas de Contato', isWon: false, isClosed: false },
  '1242702154': { stage: 'Não Elegível', isWon: false, isClosed: true },
  '1242702155': { stage: 'Elegível', isWon: false, isClosed: false },
  '1242702156': { stage: 'Reunião Agendada', isWon: false, isClosed: false },
  '1242702157': { stage: 'Reunião Realizada', isWon: false, isClosed: false },
  '1242773167': { stage: 'Proposta Enviada', isWon: false, isClosed: false },
  '1242773168': { stage: 'Follow Up Ativo', isWon: false, isClosed: false },
  '1242773169': { stage: 'Contrato Enviado', isWon: false, isClosed: false },
  '1242773170': { stage: 'Fechado', isWon: true, isClosed: true },
  '1242773171': { stage: 'Perdido', isWon: false, isClosed: true },
  // Pipeline default (fallbacks)
  'closedwon': { stage: 'Fechado', isWon: true, isClosed: true },
  'closedlost': { stage: 'Perdido', isWon: false, isClosed: true },
};

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) cleaned = '55' + cleaned;
  else if (cleaned.length === 10) cleaned = '55' + cleaned;
  return cleaned;
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

    const payload: DealWebhookPayload = await req.json();
    console.log('[hubspot-deal-webhook] Received:', JSON.stringify(payload));

    // Extrair dados do deal
    let dealId = '';
    let dealName = '';
    let dealStage = '';
    let dealValue = 0;
    let closeDate: string | null = null;
    let isWon = false;
    let isClosed = false;
    let contactHubspotId = '';
    let phone = '';

    // Formato HubSpot workflow
    if (payload.objectId) {
      dealId = payload.objectId.toString();
      dealName = payload.properties?.dealname || '';
      dealStage = payload.properties?.dealstage || '';
      dealValue = parseFloat(payload.properties?.amount || '0');
      closeDate = payload.properties?.closedate || null;
      
      // Pegar primeiro contato associado
      if (payload.associations?.contacts?.length) {
        contactHubspotId = payload.associations.contacts[0].toString();
      }
    }
    // Formato manual/direto
    else if (payload.deal_id) {
      dealId = payload.deal_id;
      dealName = payload.deal_name || '';
      dealStage = payload.deal_stage || '';
      dealValue = payload.deal_value || 0;
      closeDate = payload.close_date || null;
      isWon = payload.is_won || false;
      contactHubspotId = payload.contact_id || '';
      phone = payload.phone || '';
    }

    if (!dealId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No deal_id provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mapear stage
    const stageInfo = STAGE_MAP[dealStage.toLowerCase()] || { 
      stage: dealStage, 
      isWon: dealStage.toLowerCase().includes('won'),
      isClosed: dealStage.toLowerCase().includes('closed')
    };
    isWon = stageInfo.isWon;
    isClosed = stageInfo.isClosed;

    console.log('[hubspot-deal-webhook] Deal:', { dealId, dealStage, stageInfo, dealValue });

    // UTM data do contato
    let utmSource = '';
    let utmMedium = '';
    let utmCampaign = '';
    let utmContent = '';
    
    // Buscar contato pelo hubspot_contact_id - primeiro no banco local
    let contactPhone = phone;
    if (contactHubspotId && !contactPhone) {
      const { data: contact } = await supabase
        .from('whatsapp_contacts')
        .select('phone_number')
        .eq('hubspot_contact_id', contactHubspotId)
        .single();
      
      if (contact) {
        contactPhone = contact.phone_number;
      }
    }

    // Se não encontrou no banco, buscar via API do HubSpot
    if (contactHubspotId && !contactPhone) {
      const hubspotToken = Deno.env.get('HUBSPOT_ACCESS_TOKEN');
      if (hubspotToken) {
        try {
          const contactRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactHubspotId}?properties=phone,mobilephone,utm_source,utm_medium,utm_campaign,utm_content`,
            { headers: { 'Authorization': `Bearer ${hubspotToken}` } }
          );
          if (contactRes.ok) {
            const contactData = await contactRes.json();
            const props = contactData.properties || {};
            contactPhone = props.mobilephone || props.phone || '';
            utmSource = props.utm_source || '';
            utmMedium = props.utm_medium || '';
            utmCampaign = props.utm_campaign || '';
            utmContent = props.utm_content || '';
            console.log('[hubspot-deal-webhook] Got contact from HubSpot API:', { phone: contactPhone, utm_source: utmSource });
          }
        } catch (e) {
          console.error('[hubspot-deal-webhook] HubSpot API error:', e);
        }
      }
    }

    if (!contactPhone) {
      console.log('[hubspot-deal-webhook] No phone found for contact:', contactHubspotId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not find phone for contact',
          contact_id: contactHubspotId 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = normalizePhone(contactPhone);

    // Atualizar ou criar registro de atribuição
    const { data: existing } = await supabase
      .from('lead_attribution')
      .select('id, lead_created_at')
      .eq('phone_number', normalizedPhone)
      .single();

    const now = new Date().toISOString();
    let daysToClose: number | null = null;

    if (existing && isClosed && closeDate) {
      const leadDate = new Date(existing.lead_created_at);
      const closedDate = new Date(closeDate);
      daysToClose = Math.round((closedDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const attributionData = {
      phone_number: normalizedPhone,
      hubspot_contact_id: contactHubspotId || null,
      hubspot_deal_id: dealId,
      deal_stage: stageInfo.stage,
      deal_value: dealValue,
      is_won: isWon,
      deal_closed_at: isClosed ? (closeDate || now) : null,
      days_to_close: daysToClose,
      updated_at: now,
      // UTM data (só atualiza se tiver)
      ...(utmSource && { utm_source: utmSource }),
      ...(utmMedium && { utm_medium: utmMedium }),
      ...(utmCampaign && { utm_campaign: utmCampaign }),
      ...(utmContent && { utm_content: utmContent }),
    };

    if (existing) {
      // Update
      const { error: updateError } = await supabase
        .from('lead_attribution')
        .update(attributionData)
        .eq('id', existing.id);

      if (updateError) throw updateError;
      
      console.log('[hubspot-deal-webhook] Updated attribution:', existing.id);
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('lead_attribution')
        .insert({
          ...attributionData,
          lead_created_at: now,
          deal_created_at: now,
        });

      if (insertError) throw insertError;
      
      console.log('[hubspot-deal-webhook] Created attribution for:', normalizedPhone);
    }

    // Se ganhou, disparar evento para Meta Conversions API (CAPI)
    if (isWon && dealValue > 0) {
      console.log('[hubspot-deal-webhook] Deal won! Value:', dealValue);
      // TODO: Disparar para Meta CAPI
      // Isso será implementado na Fase 5
    }

    return new Response(
      JSON.stringify({
        success: true,
        deal_id: dealId,
        stage: stageInfo.stage,
        is_won: isWon,
        value: dealValue,
        phone: normalizedPhone,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[hubspot-deal-webhook] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
