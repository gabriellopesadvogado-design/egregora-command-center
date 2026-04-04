import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      case "rnm_request":
        text = `Oi ${firstName}, tudo bem? Verifiquei suas informações aqui. Uma última coisa: você pode me informar a data de emissão e vencimento do seu RNM? Se preferir, pode mandar uma foto que eu verifico pra você!`;
        break;
      case "welcome":
        text = `Olá ${firstName}! Aqui é a Nina, da Egrégora Migration. Vi que você tem interesse em regularizar sua situação no Brasil. Vou te fazer algumas perguntas rápidas pra entender melhor como posso te ajudar, tá bom?`;
        break;
      case "thanks":
        text = `Perfeito ${firstName}! Muito obrigada pelas informações. Vou analisar tudo e um dos nossos especialistas vai entrar em contato pra te explicar as opções. Fique tranquilo que estamos cuidando do seu caso!`;
        break;
      default:
        text = `Oi ${firstName}, aqui é a Nina da Egrégora. Como posso te ajudar?`;
    }

    // Gerar áudio com ElevenLabs
    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
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
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    // Buscar instância WhatsApp ativa
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("instance_id, provider, api_token, phone_id, waba_id")
      .eq("status", "connected")
      .single();

    if (!instance) {
      throw new Error("Nenhuma instância WhatsApp conectada");
    }

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

    let sendResult;

    if (instance.provider === "meta_official") {
      // Enviar via Meta Official API
      const { data: metaCred } = await supabase
        .from("api_credentials")
        .select("value_encrypted")
        .eq("provider", "meta_whatsapp")
        .single();

      if (!metaCred?.value_encrypted) {
        throw new Error("Token Meta não configurado");
      }

      // Upload do áudio para Meta
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      formData.append("file", audioBlob, "nina_audio.mp3");
      formData.append("type", "audio/mpeg");
      formData.append("messaging_product", "whatsapp");

      const uploadResponse = await fetch(
        `https://graph.facebook.com/v21.0/${instance.phone_id}/media`,
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
        throw new Error(`Erro upload Meta: ${JSON.stringify(uploadData)}`);
      }

      // Enviar mensagem de áudio
      const sendResponse = await fetch(
        `https://graph.facebook.com/v21.0/${instance.phone_id}/messages`,
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

      sendResult = await sendResponse.json();

    } else {
      // Fallback Z-API
      const zapiResponse = await fetch(
        `https://api.z-api.io/instances/${instance.instance_id}/token/${instance.api_token}/send-audio`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            audio: `data:audio/mpeg;base64,${audioBase64}`,
          }),
        }
      );

      sendResult = await zapiResponse.json();
    }

    // Salvar mensagem no banco
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("contact_id", contactId)
      .single();

    if (conversation) {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversation.id,
        contact_id: contactId,
        direction: "outbound",
        type: "audio",
        content: `[Áudio Nina] ${text}`,
        status: "sent",
        metadata: { 
          nina_voice: true, 
          message_type: messageType,
          eleven_labs_chars: text.length 
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageType,
        charsUsed: text.length,
        sendResult 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
