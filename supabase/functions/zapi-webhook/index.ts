import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Auto sentiment analysis threshold
const AUTO_SENTIMENT_THRESHOLD = 5;
const AUTO_CATEGORIZATION_THRESHOLD = 5;

interface ZAPIWebhookPayload {
  // Z-API envia diferentes estruturas dependendo do evento
  phone?: string;
  fromMe?: boolean;
  mompiId?: string;
  messageId?: string;
  status?: string;
  type?: string;
  text?: { message: string };
  image?: { imageUrl: string; caption?: string; mimeType?: string };
  audio?: { audioUrl: string; mimeType?: string };
  video?: { videoUrl: string; caption?: string; mimeType?: string };
  document?: { documentUrl: string; fileName?: string; mimeType?: string };
  sticker?: { stickerUrl: string; mimeType?: string };
  contact?: { displayName: string; vcard: string };
  senderName?: string;
  senderPhoto?: string;
  isGroup?: boolean;
  participantPhone?: string;
  // Quotation
  quotedMessage?: {
    messageId: string;
    content: string;
  };
}

// Normalize phone number (Z-API já envia limpo, mas garantimos)
function normalizePhoneNumber(phone: string): { phone: string; isGroup: boolean } {
  const isGroup = phone.includes('@g.us') || phone.includes('-');
  let cleanPhone = phone
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@c.us', '')
    .replace(/\D/g, '');

  // Normalização para números brasileiros (adiciona 9 se necessário)
  if (cleanPhone.startsWith('55') && cleanPhone.length === 12) {
    const countryCode = cleanPhone.substring(0, 2);
    const ddd = cleanPhone.substring(2, 4);
    const number = cleanPhone.substring(4);
    cleanPhone = `${countryCode}${ddd}9${number}`;
    console.log(`[zapi-webhook] Brazilian phone normalized: ${cleanPhone}`);
  }

  return { phone: cleanPhone, isGroup };
}

// Detect message type from Z-API payload
function getMessageType(payload: ZAPIWebhookPayload): string {
  if (payload.text) return 'text';
  if (payload.image) return 'image';
  if (payload.audio) return 'audio';
  if (payload.video) return 'video';
  if (payload.document) return 'document';
  if (payload.sticker) return 'sticker';
  if (payload.contact) return 'contact';
  return 'text';
}

// Extract content from Z-API message
function getMessageContent(payload: ZAPIWebhookPayload, type: string): string {
  if (payload.text?.message) return payload.text.message;
  if (payload.image?.caption) return payload.image.caption;
  if (payload.video?.caption) return payload.video.caption;
  if (payload.contact?.displayName) return `📇 ${payload.contact.displayName}`;
  
  const descriptions: Record<string, string> = {
    image: '📷 Imagem',
    audio: '🎵 Áudio',
    video: '🎥 Vídeo',
    document: '📄 Documento',
    sticker: '🎨 Sticker',
  };
  
  return descriptions[type] || 'Mensagem';
}

// Get media URL from Z-API payload
function getMediaUrl(payload: ZAPIWebhookPayload, type: string): string | null {
  if (payload.image?.imageUrl) return payload.image.imageUrl;
  if (payload.audio?.audioUrl) return payload.audio.audioUrl;
  if (payload.video?.videoUrl) return payload.video.videoUrl;
  if (payload.document?.documentUrl) return payload.document.documentUrl;
  if (payload.sticker?.stickerUrl) return payload.sticker.stickerUrl;
  return null;
}

// Get media mimetype from Z-API payload
function getMediaMimetype(payload: ZAPIWebhookPayload, type: string): string | null {
  if (payload.image?.mimeType) return payload.image.mimeType;
  if (payload.audio?.mimeType) return payload.audio.mimeType;
  if (payload.video?.mimeType) return payload.video.mimeType;
  if (payload.document?.mimeType) return payload.document.mimeType;
  if (payload.sticker?.mimeType) return payload.sticker.mimeType;
  return null;
}

// Find or create contact
async function findOrCreateContact(
  supabase: any,
  instanceId: string,
  phoneNumber: string,
  name: string,
  isGroup: boolean,
  isFromMe: boolean,
  profilePictureUrl?: string
): Promise<string | null> {
  try {
    // Gerar variantes do número para números brasileiros
    const phoneVariants = [phoneNumber];

    if (phoneNumber.startsWith('55') && phoneNumber.length === 13) {
      const withoutNinth = phoneNumber.slice(0, 4) + phoneNumber.slice(5);
      phoneVariants.push(withoutNinth);
    }
    if (phoneNumber.startsWith('55') && phoneNumber.length === 12) {
      const withNinth = phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4);
      phoneVariants.push(withNinth);
    }

    console.log(`[zapi-webhook] Searching contacts with variants: ${phoneVariants.join(', ')}`);

    const { data: existingContact } = await supabase
      .from('whatsapp_contacts')
      .select('id, name, phone_number, profile_picture_url')
      .eq('instance_id', instanceId)
      .in('phone_number', phoneVariants)
      .maybeSingle();

    if (existingContact) {
      // Atualizar número se formato antigo
      if (existingContact.phone_number !== phoneNumber) {
        await supabase
          .from('whatsapp_contacts')
          .update({ 
            phone_number: phoneNumber,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingContact.id);
      }

      // Atualizar nome se necessário
      const shouldUpdateName = !isFromMe && 
                               name !== phoneNumber && 
                               existingContact.name === phoneNumber;
      
      // Atualizar foto de perfil se fornecida e diferente
      const shouldUpdatePhoto = profilePictureUrl && 
                                profilePictureUrl !== existingContact.profile_picture_url;

      if (shouldUpdateName || shouldUpdatePhoto) {
        const updateData: any = { updated_at: new Date().toISOString() };
        if (shouldUpdateName) updateData.name = name;
        if (shouldUpdatePhoto) updateData.profile_picture_url = profilePictureUrl;
        
        await supabase
          .from('whatsapp_contacts')
          .update(updateData)
          .eq('id', existingContact.id);
      }
      
      return existingContact.id;
    }

    // Create new contact
    const contactName = isFromMe ? phoneNumber : (name || phoneNumber);
    
    const { data: newContact, error } = await supabase
      .from('whatsapp_contacts')
      .insert({
        instance_id: instanceId,
        phone_number: phoneNumber,
        name: contactName,
        is_group: isGroup,
        profile_picture_url: profilePictureUrl || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[zapi-webhook] Error creating contact:', error);
      return null;
    }

    console.log(`[zapi-webhook] Contact created: ${newContact.id}`);
    return newContact.id;
  } catch (error) {
    console.error('[zapi-webhook] Error in findOrCreateContact:', error);
    return null;
  }
}

// Apply auto-assignment rules
async function applyAutoAssignment(
  supabase: any,
  instanceId: string,
  conversationId: string
): Promise<void> {
  try {
    const { data: rule } = await supabase
      .from('assignment_rules')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('is_active', true)
      .maybeSingle();

    if (!rule) return;

    let assignedTo: string | null = null;

    if (rule.rule_type === 'fixed') {
      assignedTo = rule.fixed_agent_id;
    } else if (rule.rule_type === 'round_robin') {
      const agents = rule.round_robin_agents || [];
      if (agents.length === 0) return;

      const nextIndex = (rule.round_robin_last_index + 1) % agents.length;
      assignedTo = agents[nextIndex];

      await supabase
        .from('assignment_rules')
        .update({ round_robin_last_index: nextIndex })
        .eq('id', rule.id);
    }

    if (assignedTo) {
      await supabase
        .from('whatsapp_conversations')
        .update({ assigned_to: assignedTo })
        .eq('id', conversationId);

      await supabase
        .from('conversation_assignments')
        .insert({
          conversation_id: conversationId,
          assigned_to: assignedTo,
          reason: `Auto-atribuição: ${rule.name}`,
        });
    }
  } catch (error) {
    console.error('[zapi-webhook] Error applying auto-assignment:', error);
  }
}

// Find or create conversation
async function findOrCreateConversation(
  supabase: any,
  instanceId: string,
  contactId: string
): Promise<string | null> {
  try {
    const { data: existingConversation } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('instance_id', instanceId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (existingConversation) {
      return existingConversation.id;
    }

    const { data: newConversation, error } = await supabase
      .from('whatsapp_conversations')
      .insert({
        instance_id: instanceId,
        contact_id: contactId,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[zapi-webhook] Error creating conversation:', error);
      return null;
    }

    console.log('[zapi-webhook] Conversation created:', newConversation.id);
    await applyAutoAssignment(supabase, instanceId, newConversation.id);
    
    return newConversation.id;
  } catch (error) {
    console.error('[zapi-webhook] Error in findOrCreateConversation:', error);
    return null;
  }
}

// Check and trigger automatic sentiment analysis
async function checkAndTriggerAutoSentiment(
  supabase: any,
  conversationId: string,
  supabaseUrl: string
) {
  try {
    const { data: lastAnalysis } = await supabase
      .from('whatsapp_sentiment_analysis')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    let query = supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('is_from_me', false);

    if (lastAnalysis?.created_at) {
      query = query.gt('timestamp', lastAnalysis.created_at);
    }

    const { count } = await query;

    if (count && count >= AUTO_SENTIMENT_THRESHOLD) {
      fetch(`${supabaseUrl}/functions/v1/analyze-whatsapp-sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ conversationId }),
      }).catch(err => console.error('[zapi-webhook] Error triggering sentiment:', err));
    }
  } catch (error) {
    console.error('[zapi-webhook] Error checking sentiment:', error);
  }
}

// Process incoming message
async function processMessage(payload: ZAPIWebhookPayload, instanceId: string, supabase: any) {
  try {
    if (!payload.phone) {
      console.log('[zapi-webhook] No phone in payload');
      return;
    }

    const { phone, isGroup } = normalizePhoneNumber(payload.phone);
    const isFromMe = payload.fromMe || false;
    const messageId = payload.messageId || payload.mompiId || `msg_${Date.now()}`;
    
    console.log('[zapi-webhook] Processing message:', messageId, 'from:', phone);

    // Get instance data
    const { data: instanceData } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status')
      .eq('id', instanceId)
      .single();

    if (!instanceData) {
      console.error('[zapi-webhook] Instance not found');
      return;
    }

    // Update status to connected
    if (instanceData.status !== 'connected') {
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'connected', updated_at: new Date().toISOString() })
        .eq('id', instanceId);
    }

    // Find or create contact
    const contactId = await findOrCreateContact(
      supabase,
      instanceId,
      phone,
      payload.senderName || phone,
      isGroup,
      isFromMe,
      payload.senderPhoto
    );

    if (!contactId) return;

    // Find or create conversation
    const conversationId = await findOrCreateConversation(supabase, instanceId, contactId);
    if (!conversationId) return;

    // Get message details
    const messageType = getMessageType(payload);
    const content = getMessageContent(payload, messageType);
    const mediaUrl = getMediaUrl(payload, messageType);
    const mediaMimetype = getMediaMimetype(payload, messageType);
    const quotedMessageId = payload.quotedMessage?.messageId || null;

    console.log('[zapi-webhook] Message type:', messageType, 'Content:', content.substring(0, 50));

    // Save message
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        remote_jid: phone,
        message_id: messageId,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        media_mimetype: mediaMimetype,
        is_from_me: isFromMe,
        status: 'sent',
        quoted_message_id: quotedMessageId,
        timestamp: new Date().toISOString(),
      });

    if (messageError) {
      console.error('[zapi-webhook] Error saving message:', messageError);
      return;
    }

    // Trigger audio transcription if needed
    if (messageType === 'audio' && mediaUrl) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      const { data: insertedMessage } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('message_id', messageId)
        .eq('conversation_id', conversationId)
        .single();

      if (insertedMessage) {
        fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messageId: insertedMessage.id }),
        }).catch(err => console.error('[zapi-webhook] Error triggering transcription:', err));
      }
    }

    // Update conversation
    const updateData: any = {
      last_message_at: new Date().toISOString(),
      last_message_preview: content.substring(0, 100),
    };

    if (!isFromMe) {
      const { data: currentConv } = await supabase
        .from('whatsapp_conversations')
        .select('unread_count')
        .eq('id', conversationId)
        .single();

      updateData.unread_count = (currentConv?.unread_count || 0) + 1;
    }

    await supabase
      .from('whatsapp_conversations')
      .update(updateData)
      .eq('id', conversationId);

    // Trigger auto-sentiment if from client
    if (!isFromMe) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      checkAndTriggerAutoSentiment(supabase, conversationId, supabaseUrl);
    }

    console.log('[zapi-webhook] Message processed successfully');
  } catch (error) {
    console.error('[zapi-webhook] Error processing message:', error);
  }
}

// Process message status update
async function processStatusUpdate(payload: any, supabase: any) {
  try {
    const messageId = payload.messageId || payload.mompiId;
    if (!messageId) return;

    // Z-API status: PENDING, SENT, RECEIVED, READ, PLAYED
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'SENT': 'sent',
      'RECEIVED': 'delivered',
      'READ': 'read',
      'PLAYED': 'read',
    };

    const status = statusMap[payload.status] || 'sent';

    const { error } = await supabase
      .from('whatsapp_messages')
      .update({ status })
      .eq('message_id', messageId);

    if (error) {
      console.error('[zapi-webhook] Error updating status:', error);
    } else {
      console.log('[zapi-webhook] Status updated:', messageId, '->', status);
    }
  } catch (error) {
    console.error('[zapi-webhook] Error in processStatusUpdate:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Z-API envia instance ID via query param ou header
    const url = new URL(req.url);
    const instanceId = url.searchParams.get('instance_id') || req.headers.get('x-instance-id');

    if (!instanceId) {
      console.error('[zapi-webhook] No instance_id provided');
      return new Response(
        JSON.stringify({ error: 'instance_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    console.log('[zapi-webhook] Received webhook for instance:', instanceId, 'Type:', payload.type || 'message');

    // Z-API diferencia eventos pelo campo "type" ou estrutura do payload
    if (payload.status && !payload.text && !payload.image && !payload.audio) {
      // É uma atualização de status
      await processStatusUpdate(payload, supabase);
    } else {
      // É uma mensagem
      await processMessage(payload, instanceId, supabase);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[zapi-webhook] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
