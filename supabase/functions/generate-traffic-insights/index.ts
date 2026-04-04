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

    // Buscar API key da OpenAI
    const { data: cred } = await supabase
      .from("api_credentials")
      .select("value_encrypted")
      .eq("provider", "openai")
      .single();

    if (!cred?.value_encrypted) {
      throw new Error("OpenAI API key não configurada");
    }

    const openaiKey = cred.value_encrypted;

    // Definir período (ontem)
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const periodoFim = ontem.toISOString().split('T')[0];
    const periodoInicio = periodoFim;

    // Buscar métricas do dia anterior
    const { data: campanhas } = await supabase
      .from("mkt_campaigns")
      .select("*")
      .gte("updated_at", periodoInicio)
      .lte("updated_at", periodoFim + "T23:59:59");

    const { data: resultados } = await supabase
      .from("mkt_results")
      .select("*")
      .eq("date", periodoFim);

    // Calcular métricas agregadas
    const totalSpend = resultados?.reduce((acc, r) => acc + (r.spend || 0), 0) || 0;
    const totalClicks = resultados?.reduce((acc, r) => acc + (r.clicks || 0), 0) || 0;
    const totalImpressions = resultados?.reduce((acc, r) => acc + (r.impressions || 0), 0) || 0;
    const totalLeads = resultados?.reduce((acc, r) => acc + (r.conversions || 0), 0) || 0;
    
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

    // Buscar métricas do dia anterior para comparação
    const anteontem = new Date(ontem);
    anteontem.setDate(anteontem.getDate() - 1);
    const periodoAnterior = anteontem.toISOString().split('T')[0];

    const { data: resultadosAnteriores } = await supabase
      .from("mkt_results")
      .select("*")
      .eq("date", periodoAnterior);

    const spendAnterior = resultadosAnteriores?.reduce((acc, r) => acc + (r.spend || 0), 0) || 0;
    const leadsAnterior = resultadosAnteriores?.reduce((acc, r) => acc + (r.conversions || 0), 0) || 0;
    const cplAnterior = leadsAnterior > 0 ? spendAnterior / leadsAnterior : 0;

    const metricas = {
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      leads: totalLeads,
      ctr: ctr.toFixed(2),
      cpc: cpc.toFixed(2),
      cpl: cpl.toFixed(2),
      variacao_spend: spendAnterior > 0 ? ((totalSpend - spendAnterior) / spendAnterior * 100).toFixed(1) : 0,
      variacao_leads: leadsAnterior > 0 ? ((totalLeads - leadsAnterior) / leadsAnterior * 100).toFixed(1) : 0,
      variacao_cpl: cplAnterior > 0 ? ((cpl - cplAnterior) / cplAnterior * 100).toFixed(1) : 0,
    };

    // Gerar insights com GPT-4
    const prompt = `Você é um especialista em tráfego pago e marketing digital para uma consultoria de imigração brasileira (Egrégora Migration).

Analise as métricas de ontem (${periodoFim}) e forneça insights acionáveis:

MÉTRICAS DO DIA:
- Investimento: R$ ${totalSpend.toFixed(2)} (variação: ${metricas.variacao_spend}%)
- Leads gerados: ${totalLeads} (variação: ${metricas.variacao_leads}%)
- CPL (Custo por Lead): R$ ${cpl.toFixed(2)} (variação: ${metricas.variacao_cpl}%)
- Cliques: ${totalClicks}
- Impressões: ${totalImpressions}
- CTR: ${ctr.toFixed(2)}%
- CPC: R$ ${cpc.toFixed(2)}

REGRAS:
1. Seja direto e objetivo
2. Máximo 4 insights principais
3. Inclua 2-3 recomendações práticas
4. Dê uma nota geral de 0-100 para o desempenho do dia
5. Use português brasileiro

Responda em JSON:
{
  "insights": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "score_geral": 75,
  "resumo": "Uma frase resumindo o dia"
}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

    // Buscar insight anterior para calcular variação do score
    const { data: insightAnterior } = await supabase
      .from("mkt_ai_insights")
      .select("score_geral")
      .order("periodo_fim", { ascending: false })
      .limit(1)
      .single();

    const variacaoScore = insightAnterior?.score_geral 
      ? parsed.score_geral - insightAnterior.score_geral 
      : 0;

    // Salvar no banco
    const { data: novoInsight, error: insertError } = await supabase
      .from("mkt_ai_insights")
      .insert({
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        tipo_periodo: "diario",
        metricas,
        insights: parsed.insights,
        recomendacoes: parsed.recomendacoes,
        score_geral: parsed.score_geral,
        variacao_score: variacaoScore,
        raw_response: { resumo: parsed.resumo, openai_response: openaiData },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ 
      success: true, 
      insight: novoInsight,
      resumo: parsed.resumo 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
