import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Processa a resposta da Nina, detectando comandos especiais como [ENVIAR_AUDIO:tipo]
 * e executando as ações correspondentes.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ninaResponse, contactId, conversationId, leadName } = await req.json();

    if (!ninaResponse || !contactId) {
      throw new Error("ninaResponse e contactId são obrigatórios");
    }

    const results: any[] = [];

    // Detectar comandos de áudio [ENVIAR_AUDIO:tipo]
    const audioRegex = /\[ENVIAR_AUDIO:(\w+)\]/g;
    const audioMatches = [...ninaResponse.matchAll(audioRegex)];

    // Remover comandos do texto que será enviado
    let textToSend = ninaResponse.replace(audioRegex, "").trim();

    // Detectar bloco de qualificação
    const qualificationRegex = /\[QUALIFICACAO_COMPLETA\][\s\S]*?\[\/QUALIFICACAO_COMPLETA\]/;
    const hasQualification = qualificationRegex.test(ninaResponse);

    // Remover bloco de qualificação do texto visível
    textToSend = textToSend.replace(qualificationRegex, "").trim();

    // Se tiver texto, envia primeiro
    if (textToSend) {
      // Buscar conversation para enviar mensagem
      const { data: conversation } = await supabase
        .from("whatsapp_conversations")
        .select("id, instance_id")
        .eq("id", conversationId)
        .single();

      if (conversation) {
        // Enviar texto via send-whatsapp-message
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-message`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            messageType: "text",
            content: textToSend,
          }),
        });

        const sendResult = await sendResponse.json();
        results.push({ type: "text", success: sendResult.success, content: textToSend.substring(0, 50) + "..." });
      }
    }

    // Enviar áudios se houver comandos
    for (const match of audioMatches) {
      const audioType = match[1]; // rnm_request, welcome, thanks

      try {
        const audioResponse = await fetch(`${supabaseUrl}/functions/v1/nina-voice-message`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contactId,
            leadName: leadName || "amigo",
            messageType: audioType,
          }),
        });

        const audioResult = await audioResponse.json();
        results.push({ 
          type: "audio", 
          audioType, 
          success: audioResult.success,
          charsUsed: audioResult.charsUsed 
        });

      } catch (audioError: any) {
        console.error(`Erro ao enviar áudio ${audioType}:`, audioError);
        results.push({ type: "audio", audioType, success: false, error: audioError.message });
      }
    }

    // Processar qualificação se houver
    if (hasQualification) {
      try {
        const qualResponse = await fetch(`${supabaseUrl}/functions/v1/process-qualification`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_content: ninaResponse,
            contact_id: contactId,
            conversation_id: conversationId,
          }),
        });

        const qualResult = await qualResponse.json();
        results.push({ type: "qualification", ...qualResult });

      } catch (qualError: any) {
        console.error("Erro ao processar qualificação:", qualError);
        results.push({ type: "qualification", success: false, error: qualError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCommands: results.length,
        results,
        textSent: textToSend ? textToSend.substring(0, 100) : null,
        hadAudioCommands: audioMatches.length > 0,
        hadQualification: hasQualification,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
