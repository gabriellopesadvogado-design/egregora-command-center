import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Nina Auto-Reply - Verifica mensagens não respondidas e faz a Nina responder
 * Roda via cron a cada 1 minuto
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar conversas com Nina ativada que têm mensagens não respondidas
    // (última mensagem é do usuário e foi há mais de 30 segundos)
    const oneMinuteAgo = new Date(Date.now() - 30 * 1000).toISOString();
    
    const { data: conversations, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select(`
        id,
        contact_id,
        metadata,
        nina_context,
        whatsapp_contacts!inner (
          id,
          phone_number,
          name,
          lead_id
        )
      `)
      .eq("status", "nina");
    
    // Filtrar apenas conversas com nina_enabled = true
    const activeConversations = (conversations || []).filter(
      (c: any) => c.metadata?.nina_enabled === true
    );

    if (convError) {
      console.error("Erro ao buscar conversas:", convError);
      throw convError;
    }

    console.log(`[nina-auto-reply] Verificando ${activeConversations.length} conversas com Nina ativa`);

    const results: any[] = [];

    for (const conv of activeConversations) {

      // Buscar últimas mensagens da conversa
      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("content, message_from, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!messages || messages.length === 0) continue;

      const lastMsg = messages[0];
      
      // Verificar se última mensagem é do usuário e foi há mais de 30 segundos
      if (!["user", "human"].includes(lastMsg.message_from)) {
        continue; // Última mensagem já é da Nina
      }

      const lastMsgTime = new Date(lastMsg.created_at).getTime();
      const now = Date.now();
      const diffSeconds = (now - lastMsgTime) / 1000;

      if (diffSeconds < 30) {
        continue; // Mensagem muito recente, esperar mais
      }

      console.log(`[nina-auto-reply] Conversa ${conv.id}: última msg do usuário há ${Math.round(diffSeconds)}s`);

      // Buscar credenciais
      const { data: openaiCred } = await supabase
        .from("api_credentials")
        .select("value_encrypted")
        .eq("provider", "openai")
        .single();

      const { data: metaCred } = await supabase
        .from("api_credentials")
        .select("value_encrypted, metadata")
        .eq("provider", "meta")
        .single();

      if (!openaiCred || !metaCred) {
        console.error("[nina-auto-reply] Credenciais não encontradas");
        continue;
      }

      // Montar histórico da conversa para contexto
      const history = messages.reverse().map((m: any) => ({
        role: ["user", "human"].includes(m.message_from) ? "user" : "assistant",
        content: m.content || "",
      })).filter((m: any) => m.content);

      // Buscar contexto já coletado
      const ninaContext = conv.nina_context || {};
      
      // Buscar prompt do agente Nina no banco
      const { data: ninaAgent } = await supabase
        .from("ai_agents")
        .select("system_prompt")
        .eq("name", "Nina")
        .single();
      
      // Adicionar contexto coletado ao prompt
      let collectedInfo = "";
      if (ninaContext.nome) collectedInfo += `- Nome: ${ninaContext.nome} ✓\n`;
      if (ninaContext.nacionalidade) collectedInfo += `- Nacionalidade: ${ninaContext.nacionalidade} ✓\n`;
      if (ninaContext.tempo_brasil) collectedInfo += `- Tempo no Brasil: ${ninaContext.tempo_brasil} ✓\n`;
      if (ninaContext.condicao_rnm) collectedInfo += `- RNM: ${ninaContext.condicao_rnm} ✓\n`;
      if (ninaContext.vinculos) collectedInfo += `- Vínculos: ${ninaContext.vinculos} ✓\n`;
      if (ninaContext.estudo_brasil) collectedInfo += `- Estudo no Brasil: ${ninaContext.estudo_brasil} ✓\n`;

      const systemPrompt = ninaAgent?.system_prompt 
        ? `${ninaAgent.system_prompt}\n\nINFORMAÇÕES JÁ COLETADAS NESTA CONVERSA:\n${collectedInfo || "(nenhuma ainda)"}`
        : `Você é Nina, SDR da Egrégora Migration. Qualifique o lead coletando: nome, nacionalidade, tempo no Brasil, condição do RNM, vínculos familiares e se estudou no Brasil. Seja direta e simpática.`;

      // Chamar OpenAI
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiCred.value_encrypted}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      const openaiData = await openaiResponse.json();
      let ninaReply = openaiData.choices?.[0]?.message?.content || "";

      if (!ninaReply) {
        console.error("[nina-auto-reply] OpenAI não retornou resposta");
        continue;
      }

      console.log(`[nina-auto-reply] Nina resposta: ${ninaReply.substring(0, 100)}...`);

      // Verificar se tem comando de áudio
      const audioMatch = ninaReply.match(/\[ENVIAR_AUDIO:(\w+)\]/);
      const cleanReply = ninaReply.replace(/\[ENVIAR_AUDIO:\w+\]/g, "").trim();

      // Enviar mensagem de texto via Meta API
      const phoneId = metaCred.metadata?.phone_number_id;
      const contact = conv.whatsapp_contacts as any;
      const destPhone = contact.phone_number.replace(/\D/g, "");

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
            to: destPhone,
            type: "text",
            text: { body: cleanReply },
          }),
        }
      );

      const sendResult = await sendResponse.json();
      
      // Salvar mensagem no banco
      const { error: insertError } = await supabase.from("whatsapp_messages").insert({
        conversation_id: conv.id,
        contact_id: contact.id,
        message_from: "nina",
        message_type: "text",
        content: cleanReply,
        status: "sent",
        sent_at: new Date().toISOString(),
        whatsapp_message_id: sendResult.messages?.[0]?.id,
      });
      
      if (insertError) {
        console.error("[nina-auto-reply] Erro ao salvar mensagem:", insertError);
      }

      // Se tiver comando de áudio, enviar áudio
      if (audioMatch) {
        const audioType = audioMatch[1];
        console.log(`[nina-auto-reply] Enviando áudio: ${audioType}`);

        try {
          await fetch(`${supabaseUrl}/functions/v1/nina-voice-message`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contactId: contact.id,
              leadName: contact.name || "amigo",
              messageType: audioType,
            }),
          });
        } catch (audioErr) {
          console.error("[nina-auto-reply] Erro ao enviar áudio:", audioErr);
        }
      }

      // Atualizar contexto da conversa (extrair informações da última resposta do usuário)
      const updatedContext = { ...ninaContext };
      const userLastMsg = lastMsg.content?.toLowerCase() || "";
      
      // Tentar extrair informações da resposta
      if (!ninaContext.pais_nascimento && history.length <= 3) {
        updatedContext.pais_nascimento = lastMsg.content;
      } else if (!ninaContext.tempo_brasil && /\d+\s*(ano|mes|meses|years?)/.test(userLastMsg)) {
        updatedContext.tempo_brasil = lastMsg.content;
      } else if (!ninaContext.servico_interesse && /(natural|resid|autor)/i.test(userLastMsg)) {
        updatedContext.servico_interesse = lastMsg.content;
      } else if (!ninaContext.rnm_classificacao && /(tempor|indeterm|não|nao|tenho)/i.test(userLastMsg)) {
        updatedContext.rnm_classificacao = lastMsg.content;
      } else if (ninaContext.rnm_classificacao && ninaContext.casado_brasileiro === undefined) {
        updatedContext.casado_brasileiro = /(sim|yes|sou|tenho)/i.test(userLastMsg);
      } else if (updatedContext.casado_brasileiro !== undefined && ninaContext.filhos_brasileiros === undefined) {
        updatedContext.filhos_brasileiros = /(sim|yes|tenho)/i.test(userLastMsg);
      }

      await supabase
        .from("whatsapp_conversations")
        .update({ nina_context: updatedContext })
        .eq("id", conv.id);

      results.push({
        conversation_id: conv.id,
        contact_name: contact.name,
        reply_sent: true,
        had_audio: !!audioMatch,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[nina-auto-reply] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
