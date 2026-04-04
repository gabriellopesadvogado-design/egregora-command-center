import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HubSpotContact {
  vid?: number;
  properties?: {
    firstname?: { value: string };
    lastname?: { value: string };
    phone?: { value: string };
    mobilephone?: { value: string };
    email?: { value: string };
    hubspot_owner_id?: { value: string };
  };
}

interface WebhookPayload {
  // HubSpot webhook format
  objectId?: number;
  propertyName?: string;
  propertyValue?: string;
  subscriptionType?: string;
  // Or direct contact data
  contact?: HubSpotContact;
  // Manual test format
  phone?: string;
  name?: string;
  email?: string;
  hubspot_contact_id?: string;
  sdr_hubspot_owner_id?: number;
}

function normalizePhone(phone: string): string {
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  
  // Adiciona 55 se não tiver código do país
  if (cleaned.length === 11) {
    cleaned = '55' + cleaned;
  } else if (cleaned.length === 10) {
    // Número antigo sem o 9
    cleaned = '55' + cleaned;
  }
  
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

    const payload: WebhookPayload = await req.json();
    console.log('[hubspot-webhook] Received:', JSON.stringify(payload));

    // Extrair dados do lead
    let phone = '';
    let name = '';
    let email = '';
    let hubspotContactId = '';
    let sdrHubspotOwnerId: number | null = null;

    // Formato manual/teste
    if (payload.phone) {
      phone = payload.phone;
      name = payload.name || '';
      email = payload.email || '';
      hubspotContactId = payload.hubspot_contact_id || '';
      sdrHubspotOwnerId = payload.sdr_hubspot_owner_id || null;
    }
    // Formato HubSpot webhook
    else if (payload.contact?.properties) {
      const props = payload.contact.properties;
      phone = props.mobilephone?.value || props.phone?.value || '';
      name = [props.firstname?.value, props.lastname?.value].filter(Boolean).join(' ');
      email = '';
      hubspotContactId = payload.contact.vid?.toString() || '';
      sdrHubspotOwnerId = props.hubspot_owner_id?.value ? parseInt(props.hubspot_owner_id.value) : null;
    }

    if (!phone) {
      console.log('[hubspot-webhook] No phone number provided');
      return new Response(
        JSON.stringify({ success: false, error: 'No phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    console.log('[hubspot-webhook] Normalized phone:', normalizedPhone);

    // Verificar se é número de teste
    const { data: testNumber } = await supabase
      .from('test_phone_numbers')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .eq('is_active', true)
      .single();

    if (!testNumber) {
      console.log('[hubspot-webhook] Phone not in test list, ignoring');
      return new Response(
        JSON.stringify({ success: true, message: 'Phone not in test list, ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[hubspot-webhook] Test phone confirmed, processing...');

    // Buscar ou criar contato
    let { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single();

    if (!contact) {
      const { data: newContact, error: contactError } = await supabase
        .from('whatsapp_contacts')
        .insert({
          phone_number: normalizedPhone,
          name: name || null,
          email: email || null,
          hubspot_contact_id: hubspotContactId || null,
        })
        .select('id')
        .single();

      if (contactError) {
        console.error('[hubspot-webhook] Error creating contact:', contactError);
        throw contactError;
      }
      contact = newContact;
    }

    // Buscar SDR baseado no hubspot_owner_id
    let sdrUserId: string | null = null;
    let sdrInstanceId: string | null = null;

    if (sdrHubspotOwnerId) {
      const { data: sdrUser } = await supabase
        .from('core_users')
        .select('id')
        .eq('hubspot_owner_id', sdrHubspotOwnerId)
        .eq('ativo', true)
        .single();

      if (sdrUser) {
        sdrUserId = sdrUser.id;

        // Buscar instância do SDR
        const { data: sdrInstance } = await supabase
          .from('whatsapp_instances')
          .select('id')
          .eq('user_id', sdrUserId)
          .eq('is_active', true)
          .single();

        if (sdrInstance) {
          sdrInstanceId = sdrInstance.id;
        }
      }
    }

    // Se não encontrou SDR específico, usar o primeiro SDR ativo
    if (!sdrInstanceId) {
      const { data: defaultInstance } = await supabase
        .from('whatsapp_instances')
        .select('id, user_id')
        .eq('tipo', 'sdr')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (defaultInstance) {
        sdrInstanceId = defaultInstance.id;
        sdrUserId = defaultInstance.user_id;
      }
    }

    // Criar entrada na fila de automação
    const waitUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    const { data: queueEntry, error: queueError } = await supabase
      .from('lead_automation_queue')
      .insert({
        contact_id: contact.id,
        phone_number: normalizedPhone,
        hubspot_contact_id: hubspotContactId || null,
        lead_name: name || null,
        lead_email: email || null,
        sdr_user_id: sdrUserId,
        sdr_instance_id: sdrInstanceId,
        status: 'waiting',
        wait_until: waitUntil.toISOString(),
        source: 'hubspot',
      })
      .select('id')
      .single();

    if (queueError) {
      console.error('[hubspot-webhook] Error creating queue entry:', queueError);
      throw queueError;
    }

    // Log da ação
    await supabase.from('lead_automation_log').insert({
      queue_id: queueEntry.id,
      action: 'lead_received',
      details: {
        source: 'hubspot',
        phone: normalizedPhone,
        name,
        hubspot_contact_id: hubspotContactId,
        sdr_user_id: sdrUserId,
        wait_until: waitUntil.toISOString(),
      },
    });

    console.log('[hubspot-webhook] Lead added to queue:', queueEntry.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lead added to automation queue',
        queue_id: queueEntry.id,
        wait_until: waitUntil.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[hubspot-webhook] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
