import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contactId, leadName, messageType } = await req.json();

    if (!contactId || !leadName) {
      throw new Error("contactId e leadName são obrigatórios");
    }

    // Buscar API key do ElevenLabs
    const { data: elevenCred } = await supabase
      .from("api_credentials")
      .select("value_encrypted, metadata")
      .eq("provider", "elevenlabs")
      .single();

    if (!elevenCred?.value_encrypted) {
      throw new Error("ElevenLabs não configurado");
    }

    const elevenLabsKey = elevenCred.value_encrypted;
    const voiceId = elevenCred.metadata?.voice_id || "m151rjrbWXbBqyq56tly";
    const modelId = elevenCred.metadata?.model_id || "eleven_multilingual_v2";

    // Texto personalizado com nome do lead
    const firstName = leadName.split(" ")[0];
    let text = "";

    switch (messageType) {
      case "apresentacao":
        text = `Olá, ${firstName}, tudo bem? Meu nome é Hugo, sou representante aqui da Egrégora, especialistas em naturalização brasileira. ${firstName}, nós recebemos aqui algumas informações do seu caso, com interesse no processo de naturalização. Vou precisar fazer algumas perguntinhas rápidas só pra validar alguns dados e verificar seus requisitos, tudo bem? São bem rápidas.`;
        break;
      case "rnm_request":
        text = `Perfeito ${firstName}! Muito obrigado por todas as informações. Pra finalizar, preciso só de mais um dado: você pode me informar a data de emissão e vencimento do seu RNM? Se preferir, pode mandar uma foto do documento que eu verifico pra você. Assim a gente consegue dar andamento no seu caso!`;
        break;
      case "welcome":
        text = `Olá ${firstName}! Aqui é o Hugo, da Egrégora Migration. Vi que você tem interesse em regularizar sua situação no Brasil. Vou te fazer algumas perguntas rápidas pra entender melhor como posso te ajudar, tá bom?`;
        break;
      case "thanks":
        text = `Perfeito ${firstName}! Muito obrigado pelas informações. Vou analisar tudo e um dos nossos especialistas vai entrar em contato pra te explicar as melhores opções pro seu caso. Fique tranquilo que estamos cuidando de tudo!`;
        break;
      default:
        text = `Oi ${firstName}, aqui é o Hugo da Egrégora. Como posso te ajudar?`;
    }

    console.log(`[nina-voice] Gerando áudio: "${text.substring(0, 50)}..." (${text.length} chars)`);

    // Gerar áudio com ElevenLabs
    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!audioResponse.ok) {
      const error = await audioResponse.text();
      throw new Error(`ElevenLabs error: ${error}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = base64Encode(new Uint8Array(audioBuffer));
    
    console.log(`[nina-voice] Áudio gerado: ${audioBuffer.byteLength} bytes`);

    // Buscar telefone do contato
    const { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("phone_number")
      .eq("id", contactId)
      .single();

    if (!contact?.phone_number) {
      throw new Error("Contato não encontrado");
    }

    const phone = contact.phone_number.replace(/\D/g, "");

    // Buscar instância WhatsApp com provider meta
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("id, provider, phone_number")
      .eq("provider", "meta")
      .eq("is_active", true)
      .single();

    if (!instance) {
      throw new Error("Nenhuma instância Meta WhatsApp ativa");
    }

    // Buscar token Meta
    const { data: metaCred } = await supabase
      .from("api_credentials")
      .select("value_encrypted, metadata")
      .eq("provider", "meta")
      .single();

    if (!metaCred?.value_encrypted) {
      throw new Error("Token Meta não configurado");
    }

    const phoneId = metaCred.metadata?.phone_number_id;
    if (!phoneId) {
      throw new Error("phone_number_id não configurado nas credenciais Meta");
    }

    console.log(`[nina-voice] Enviando áudio para ${phone} via Meta API`);

    // Upload do áudio para Meta
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
    formData.append("file", audioBlob, "nina_audio.mp3");
    formData.append("type", "audio/mpeg");
    formData.append("messaging_product", "whatsapp");

    const uploadResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/media`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${metaCred.value_encrypted}`,
        },
        body: formData,
      }
    );

    const uploadData = await uploadResponse.json();
    
    if (!uploadData.id) {
      console.error("[nina-voice] Upload failed:", uploadData);
      throw new Error(`Erro upload Meta: ${JSON.stringify(uploadData)}`);
    }

    console.log(`[nina-voice] Áudio uploaded, media_id: ${uploadData.id}`);

    // Enviar mensagem de áudio
    const sendResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${metaCred.value_encrypted}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "audio",
          audio: {
            id: uploadData.id,
          },
        }),
      }
    );

    const sendResult = await sendResponse.json();
    console.log(`[nina-voice] Mensagem enviada:`, sendResult);

    // Buscar conversa para salvar mensagem
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (conversation) {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversation.id,
        contact_id: contactId,
        message_from: "nina",
        message_type: "audio",
        content: `[Áudio Nina] ${text.substring(0, 100)}...`,
        status: "sent",
        sent_at: new Date().toISOString(),
        whatsapp_message_id: sendResult.messages?.[0]?.id,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageType,
        charsUsed: text.length,
        audioBytes: audioBuffer.byteLength,
        sendResult 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[nina-voice] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
