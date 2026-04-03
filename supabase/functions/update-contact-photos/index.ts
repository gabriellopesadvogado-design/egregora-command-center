import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Buscar foto de perfil via API da Z-API
async function fetchProfilePicture(
  instanceId: string,
  instanceToken: string,
  clientToken: string,
  phone: string
): Promise<string | null> {
  // Gerar variantes do número (com e sem o 9)
  const phoneVariants = [phone];
  
  // Números brasileiros: tentar com e sem o 9
  if (phone.startsWith('55') && phone.length === 13) {
    // Tem 9, tentar sem
    const withoutNinth = phone.slice(0, 4) + phone.slice(5);
    phoneVariants.push(withoutNinth);
  }
  if (phone.startsWith('55') && phone.length === 12) {
    // Não tem 9, tentar com
    const withNinth = phone.slice(0, 4) + '9' + phone.slice(4);
    phoneVariants.push(withNinth);
  }

  for (const phoneVariant of phoneVariants) {
    try {
      const response = await fetch(
        `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/profile-picture?phone=${phoneVariant}`,
        {
          method: 'GET',
          headers: { 'Client-Token': clientToken },
        }
      );
      const data = await response.json();
      if (data.link && data.link !== 'null') {
        console.log(`[update-contact-photos] Found profile picture with phone variant: ${phoneVariant}`);
        return data.link;
      }
    } catch (error) {
      console.log('[update-contact-photos] Could not fetch profile picture:', error);
    }
  }
  
  return null;
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

    console.log('[update-contact-photos] Starting profile picture update...');

    // Buscar instâncias Z-API ativas
    const { data: instances, error: instancesError } = await supabase
      .from('whatsapp_instances')
      .select('id, zapi_instance_id, zapi_token, zapi_client_token')
      .eq('provider', 'zapi')
      .eq('is_active', true);

    if (instancesError || !instances?.length) {
      console.log('[update-contact-photos] No active Z-API instances found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active instances', updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalUpdated = 0;
    let totalChecked = 0;

    for (const instance of instances) {
      if (!instance.zapi_instance_id || !instance.zapi_token || !instance.zapi_client_token) {
        console.log('[update-contact-photos] Instance missing Z-API credentials:', instance.id);
        continue;
      }

      // Buscar contatos que não foram atualizados nos últimos 30 dias
      // ou que nunca tiveram foto
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: contacts, error: contactsError } = await supabase
        .from('whatsapp_contacts')
        .select('id, phone_number, profile_picture_url, updated_at')
        .or(`profile_picture_url.is.null,updated_at.lt.${thirtyDaysAgo.toISOString()}`)
        .limit(100); // Limitar para não sobrecarregar a API

      if (contactsError || !contacts?.length) {
        console.log('[update-contact-photos] No contacts to update for instance:', instance.id);
        continue;
      }

      console.log(`[update-contact-photos] Checking ${contacts.length} contacts for instance ${instance.id}`);

      for (const contact of contacts) {
        totalChecked++;
        
        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));

        const photoUrl = await fetchProfilePicture(
          instance.zapi_instance_id,
          instance.zapi_token,
          instance.zapi_client_token,
          contact.phone_number
        );

        if (photoUrl && photoUrl !== contact.profile_picture_url) {
          const { error: updateError } = await supabase
            .from('whatsapp_contacts')
            .update({
              profile_picture_url: photoUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contact.id);

          if (!updateError) {
            totalUpdated++;
            console.log(`[update-contact-photos] Updated photo for ${contact.phone_number}`);
          }
        } else {
          // Atualizar updated_at mesmo se não mudou, para não verificar novamente
          await supabase
            .from('whatsapp_contacts')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', contact.id);
        }
      }
    }

    console.log(`[update-contact-photos] Done! Checked: ${totalChecked}, Updated: ${totalUpdated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: totalChecked, 
        updated: totalUpdated 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[update-contact-photos] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
