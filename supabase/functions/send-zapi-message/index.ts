import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  conversationId: string;
  content?: string;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  mediaBase64?: string;
  mediaMimetype?: string;
  fileName?: string;
  quotedMessageId?: string;
}

// Z-API Base URL
const ZAPI_BASE_URL = 'https://api.z-api.io';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: SendMessageRequest = await req.json();
    console.log('[send-zapi-message] Request:', { 
      conversationId: body.conversationId, 
      messageType: body.messageType 
    });

    // Validate request
    if (!body.conversationId || !body.messageType) {
      return new Response(
        JSON.stringify({ success: false, error: 'conversationId and messageType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.messageType === 'text' && !body.content) {
      return new Response(
        JSON.stringify({ success: false, error: 'content is required for text messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', body.conversationId)
      .single();

    if (convError || !conversation) {
      console.error('[send-zapi-message] Conversation not found:', convError);
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-zapi-message] Conversation found:', conversation.id, 'contact_id:', conversation.contact_id, 'instance_id:', conversation.instance_id);

    // Get contact
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('id', conversation.contact_id)
      .single();

    if (contactError || !contact) {
      console.error('[send-zapi-message] Contact not found:', contactError);
      return new Response(
        JSON.stringify({ success: false, error: 'Contact not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-zapi-message] Contact found:', contact.phone_number);

    // Get instance
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', conversation.instance_id)
      .single();

    if (instanceError) {
      console.error('[send-zapi-message] Instance query error:', instanceError);
      return new Response(
        JSON.stringify({ success: false, error: 'Instance query error: ' + instanceError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instance) {
      console.error('[send-zapi-message] Instance not found for id:', conversation.instance_id);
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp instance not found for id: ' + conversation.instance_id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-zapi-message] Instance found:', instance.nome, 'zapi_instance_id:', instance.zapi_instance_id);

    if (!instance.zapi_instance_id || !instance.zapi_token) {
      console.error('[send-zapi-message] Z-API credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Z-API credentials not configured for this instance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client-Token é o token da CONTA, diferente do Instance Token
    const clientToken = instance.zapi_client_token || instance.zapi_token;
    
    if (!clientToken) {
      console.error('[send-zapi-message] Z-API Client-Token not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Z-API Client-Token not configured. Go to Z-API panel > Security > Account Security Token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Z-API (apenas dígitos)
    const phone = contact.phone_number.replace(/\D/g, '');

    console.log('[send-zapi-message] Sending to:', phone, 'via Z-API instance:', instance.zapi_instance_id);

    // Build Z-API request
    const { endpoint, requestBody } = buildZAPIRequest(
      instance.zapi_instance_id,
      instance.zapi_token,
      phone,
      body
    );

    console.log('[send-zapi-message] Z-API endpoint:', endpoint);

    // Send to Z-API
    const zapiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken,
      },
      body: JSON.stringify(requestBody),
    });

    const zapiData = await zapiResponse.json();

    if (!zapiResponse.ok || zapiData.error) {
      console.error('[send-zapi-message] Z-API error:', zapiData);
      return new Response(
        JSON.stringify({ success: false, error: zapiData.error || 'Failed to send message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-zapi-message] Z-API response:', zapiData);

    // Extract message ID from Z-API response
    const messageId = zapiData.messageId || zapiData.zapiMessageId || `zapi_${Date.now()}`;

    // Save message to database
    const messageContent = body.messageType === 'text' 
      ? (body.content || '') 
      : (body.content || `Sent ${body.messageType}`);

    // Buscar contact_id da conversa
    const { data: convWithContact } = await supabase
      .from('whatsapp_conversations')
      .select('contact_id')
      .eq('id', body.conversationId)
      .single();

    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: body.conversationId,
        contact_id: convWithContact?.contact_id,
        whatsapp_message_id: messageId,
        content: messageContent,
        message_type: body.messageType,
        media_url: body.mediaUrl || null,
        media_mime_type: body.mediaMimetype || null,
        status: 'sent',
        message_from: 'human',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('[send-zapi-message] Error saving message:', saveError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation metadata
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageContent.substring(0, 100),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.conversationId);

    console.log('[send-zapi-message] Message sent and saved:', savedMessage.id);

    return new Response(
      JSON.stringify({ success: true, message: savedMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-zapi-message] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildZAPIRequest(
  instanceId: string,
  token: string,
  phone: string,
  body: SendMessageRequest
): { endpoint: string; requestBody: any } {
  const baseUrl = `${ZAPI_BASE_URL}/instances/${instanceId}/token/${token}`;

  switch (body.messageType) {
    case 'text': {
      return {
        endpoint: `${baseUrl}/send-text`,
        requestBody: {
          phone,
          message: body.content,
          ...(body.quotedMessageId && { messageId: body.quotedMessageId }),
        },
      };
    }

    case 'image': {
      return {
        endpoint: `${baseUrl}/send-image`,
        requestBody: {
          phone,
          image: body.mediaBase64 || body.mediaUrl,
          caption: body.content || '',
        },
      };
    }

    case 'audio': {
      // Z-API tem endpoint específico para áudio como mensagem de voz
      return {
        endpoint: `${baseUrl}/send-audio`,
        requestBody: {
          phone,
          audio: body.mediaBase64 || body.mediaUrl,
        },
      };
    }

    case 'video': {
      return {
        endpoint: `${baseUrl}/send-video`,
        requestBody: {
          phone,
          video: body.mediaBase64 || body.mediaUrl,
          caption: body.content || '',
        },
      };
    }

    case 'document': {
      // Extrair extensão do nome do arquivo
      const extension = body.fileName?.split('.').pop() || 'pdf';
      return {
        endpoint: `${baseUrl}/send-document/${extension}`,
        requestBody: {
          phone,
          document: body.mediaBase64 || body.mediaUrl,
          fileName: body.fileName,
          caption: body.content || '',
        },
      };
    }

    default:
      throw new Error(`Unsupported message type: ${body.messageType}`);
  }
}
