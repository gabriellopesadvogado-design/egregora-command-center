import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFY_TOKEN = 'egregora_meta_webhook_2026';

// Função para baixar mídia do Meta e fazer upload para Supabase Storage
async function downloadAndStoreMedia(
  supabase: any,
  mediaId: string,
  accessToken: string,
  messageType: string,
  mimeType: string
): Promise<string | null> {
  try {
    // 1. Obter URL temporária da mídia
    const mediaInfoResp = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const mediaInfo = await mediaInfoResp.json();
    
    if (!mediaInfo.url) {
      console.error('[meta-webhook] Could not get media URL:', mediaInfo);
      return null;
    }

    console.log('[meta-webhook] Media URL obtained:', mediaInfo.url);

    // 2. Baixar o arquivo
    const mediaResp = await fetch(mediaInfo.url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!mediaResp.ok) {
      console.error('[meta-webhook] Failed to download media:', mediaResp.status);
      return null;
    }

    const mediaBuffer = await mediaResp.arrayBuffer();
    const mediaData = new Uint8Array(mediaBuffer);

    // 3. Determinar extensão
    const extMap: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/ogg; codecs=opus': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/aac': 'aac',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'application/pdf': 'pdf',
    };
    const ext = extMap[mimeType] || mimeType.split('/')[1]?.split(';')[0] || 'bin';
    const fileName = `${messageType}_${mediaId}.${ext}`;
    const filePath = `meta-inbound/${fileName}`;

    // 4. Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, mediaData, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[meta-webhook] Upload error:', uploadError);
      return null;
    }

    // 5. Retornar URL pública
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/whatsapp-media/${filePath}`;
    console.log('[meta-webhook] Media stored at:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('[meta-webhook] Error downloading media:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Verificação do webhook (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[meta-webhook] Webhook verified!');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    console.log('[meta-webhook] Received:', JSON.stringify(body));

    // Buscar instância da API Oficial
    const { data: metaInstance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('provider', 'meta')
      .eq('is_active', true)
      .single();

    if (!metaInstance) {
      console.error('[meta-webhook] Meta instance not found');
      return new Response('OK', { status: 200 });
    }

    const instanceId = metaInstance.id;

    // Buscar token da API Oficial para download de mídia
    const { data: metaCred } = await supabase
      .from('api_credentials')
      .select('value_encrypted')
      .eq('provider', 'meta')
      .eq('credential_type', 'access_token')
      .eq('is_valid', true)
      .single();

    const accessToken = metaCred?.value_encrypted || '';

    // Processar eventos
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Processar mensagens recebidas
        for (const message of value.messages || []) {
          const from = message.from; // número do lead
          const messageId = message.id;
          const timestamp = message.timestamp;
          const messageType = message.type;

          let content = '';
          let mediaUrl = '';
          let mediaMimeType = '';
          let mediaId = '';

          if (messageType === 'text') {
            content = message.text?.body || '';
          } else if (messageType === 'image') {
            content = message.image?.caption || '[Imagem]';
            mediaMimeType = message.image?.mime_type || 'image/jpeg';
            mediaId = message.image?.id || '';
          } else if (messageType === 'audio') {
            content = '[Áudio]';
            mediaMimeType = message.audio?.mime_type || 'audio/ogg';
            mediaId = message.audio?.id || '';
          } else if (messageType === 'document') {
            content = message.document?.filename || '[Documento]';
            mediaMimeType = message.document?.mime_type || 'application/pdf';
            mediaId = message.document?.id || '';
          } else if (messageType === 'video') {
            content = message.video?.caption || '[Vídeo]';
            mediaMimeType = message.video?.mime_type || 'video/mp4';
            mediaId = message.video?.id || '';
          }

          // Baixar e armazenar mídia se houver
          if (mediaId && accessToken) {
            const storedUrl = await downloadAndStoreMedia(
              supabase,
              mediaId,
              accessToken,
              messageType,
              mediaMimeType
            );
            if (storedUrl) {
              mediaUrl = storedUrl;
            }
          }

          // Normalizar número
          const phoneNumber = from.startsWith('55') ? from : `55${from}`;

          // Buscar ou criar contato
          let { data: contact } = await supabase
            .from('whatsapp_contacts')
            .select('id')
            .eq('phone_number', phoneNumber)
            .single();

          if (!contact) {
            // Tentar com variação do número (com/sem 9)
            const altPhone = phoneNumber.length === 13 
              ? phoneNumber.slice(0, 4) + phoneNumber.slice(5)  // remove o 9
              : phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4); // adiciona o 9

            const { data: altContact } = await supabase
              .from('whatsapp_contacts')
              .select('id')
              .eq('phone_number', altPhone)
              .single();

            if (altContact) {
              contact = altContact;
            } else {
              // Criar novo contato
              const contactName = value.contacts?.[0]?.profile?.name || '';
              const { data: newContact, error: contactError } = await supabase
                .from('whatsapp_contacts')
                .insert({
                  phone_number: phoneNumber,
                  name: contactName || null,
                })
                .select('id')
                .single();

              if (contactError) {
                console.error('[meta-webhook] Error creating contact:', contactError);
                continue;
              }
              contact = newContact;
            }
          }

          // Buscar ou criar conversa na instância da API Oficial
          let { data: conversation } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('instance_id', instanceId)
            .eq('is_active', true)
            .single();

          if (!conversation) {
            const { data: newConv, error: convError } = await supabase
              .from('whatsapp_conversations')
              .insert({
                contact_id: contact.id,
                instance_id: instanceId,
                status: 'nina',
                is_active: true,
              })
              .select('id')
              .single();

            if (convError) {
              console.error('[meta-webhook] Error creating conversation:', convError);
              continue;
            }
            conversation = newConv;
          }

          // Salvar mensagem
          const sentAt = new Date(parseInt(timestamp) * 1000).toISOString();

          await supabase.from('whatsapp_messages').insert({
            conversation_id: conversation.id,
            contact_id: contact.id,
            message_from: 'user',
            message_type: messageType as any,
            content,
            media_url: mediaUrl || null,
            media_mime_type: mediaMimeType || null,
            whatsapp_message_id: messageId,
            status: 'delivered',
            sent_at: sentAt,
          });

          // Atualizar last_message_at da conversa
          await supabase
            .from('whatsapp_conversations')
            .update({ last_message_at: sentAt })
            .eq('id', conversation.id);

          console.log(`[meta-webhook] Message saved from ${phoneNumber}: ${content}`);
        }

        // Processar status de mensagens enviadas
        for (const status of value.statuses || []) {
          const messageId = status.id;
          const statusValue = status.status; // sent, delivered, read, failed

          const statusMap: Record<string, string> = {
            sent: 'sent',
            delivered: 'delivered',
            read: 'read',
            failed: 'failed',
          };

          const dbStatus = statusMap[statusValue];
          if (dbStatus) {
            await supabase
              .from('whatsapp_messages')
              .update({ 
                status: dbStatus as any,
                ...(dbStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
                ...(dbStatus === 'read' ? { read_at: new Date().toISOString() } : {}),
              })
              .eq('whatsapp_message_id', messageId);
          }
        }
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('[meta-webhook] Error:', error);
    return new Response('OK', { status: 200 }); // Sempre retorna 200 pro Meta
  }
});
