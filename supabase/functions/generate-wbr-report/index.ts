import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_MODEL_DEFAULT = "gpt-4.1-mini";
const AI_MODEL_PREMIUM = "gpt-4.1";

const PROBABILITY_MAP: Record<string, number> = {
  ruim: 0.10,
  neutra: 0.25,
  boa: 0.50,
};

interface ManualInputs {
  traffic_spend?: {
    level: "plataforma" | "campanha" | "adgroup";
    google_total?: number;
    meta_total?: number;
    google_by_campaign?: Array<{ campaign_name: string; spend_rs: number }>;
    meta_by_campaign?: Array<{ campaign_name: string; spend_rs: number }>;
    google_by_adgroup?: Array<{ campaign_name: string; adgroup_name: string; spend_rs: number }>;
    meta_by_adset?: Array<{ campaign_name: string; adset_name: string; spend_rs: number }>;
  } | null;
  sql?: {
    level: "plataforma" | "campanha" | "adgroup";
    google_total?: number;
    meta_total?: number;
    by_campaign?: Array<{ platform: string; campaign_name: string; sql_count: number }>;
    by_adgroup_adset?: Array<{ platform: string; campaign_name: string; adgroup_or_adset_name: string; sql_count: number }>;
  } | null;
  observacoes_do_gestor?: string;
}

interface RequestPayload {
  report_type: "WBR_SEMANAL" | "ANALISE_MENSAL";
  date_start: string;
  date_end: string;
  premium_mode: boolean;
  manual_inputs: ManualInputs;
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const payload: RequestPayload = await req.json();
    const { report_type, date_start, date_end, premium_mode, manual_inputs } = payload;

    if (!report_type || !date_start || !date_end) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: report_type, date_start, date_end" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // AGGREGATE DATA FROM DATABASE
    // =====================================================

    // 1. Get meetings in period
    const { data: meetings, error: meetingsError } = await supabase
      .from("crm_meetings")
      .select("*")
      .gte("data_reuniao", `${date_start}T00:00:00`)
      .lte("data_reuniao", `${date_end}T23:59:59`);

    if (meetingsError) throw meetingsError;

    // 2. Get closed meetings (fechado) in period - by data_fechamento
    const { data: closedMeetings, error: closedError } = await supabase
      .from("crm_meetings")
      .select("*")
      .eq("status", "fechado")
      .gte("data_fechamento", `${date_start}T00:00:00`)
      .lte("data_fechamento", `${date_end}T23:59:59`);

    if (closedError) throw closedError;

    // 3. Get users for name mapping
    const { data: profiles, error: profilesError } = await supabase
      .from("core_users")
      .select("id, nome, cargo");

    if (profilesError) throw profilesError;

    // 4. Get weekly targets
    const { data: weeklyTargets, error: weeklyError } = await supabase
      .from("crm_weekly_targets")
      .select("*")
      .lte("semana_inicio", date_end);

    if (weeklyError) throw weeklyError;

    // 5. Get monthly target
    const monthStart = date_start.substring(0, 7) + "-01";
    const { data: monthlyTargets, error: monthlyError } = await supabase
      .from("crm_monthly_targets")
      .select("*")
      .eq("mes", monthStart);

    if (monthlyError) throw monthlyError;

    // 6. Get yearly target
    const year = parseInt(date_start.substring(0, 4));
    const { data: yearlyTargets, error: yearlyError } = await supabase
      .from("crm_yearly_targets")
      .select("*")
      .eq("ano", year);

    if (yearlyError) throw yearlyError;

    // 7. Pipeline: ALL meetings with status proposta_enviada
    const { data: pipelineMeetings, error: pipelineError } = await supabase
      .from("crm_meetings")
      .select("*")
      .eq("status", "proposta_enviada");

    if (pipelineError) throw pipelineError;

    // 8. Proposals sent in period
    const { data: proposalsSentInPeriod, error: proposalsSentError } = await supabase
      .from("crm_meetings")
      .select("*")
      .eq("status", "proposta_enviada")
      .gte("data_reuniao", `${date_start}T00:00:00`)
      .lte("data_reuniao", `${date_end}T23:59:59`);

    if (proposalsSentError) throw proposalsSentError;

    // =====================================================
    // BUILD PROFILE MAP
    // =====================================================

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    const getProfileName = (id: string) => profileMap.get(id)?.nome || "Desconhecido";

    // =====================================================
    // CALCULATE DADOS_FIXOS
    // =====================================================

    const now = new Date();

    // --- 1. REUNIÕES REALIZADAS ---
    const realizadas = meetings?.filter((m) =>
      ["reuniao_realizada", "proposta_enviada", "fechado", "perdido", "followup_ativo", "contrato_enviado"].includes(m.status)
    ) || [];
    const totalRealizadas = realizadas.length;

    // Por origem (from crm_leads via lead_id - not available in flat query, skip)
    const reunioesOrigemArray: Array<{ origem: string; qtd: number; percentual: number }> = [];

    // Por closer
    const reunioesPorCloser: Record<string, number> = {};
    realizadas.forEach((m) => {
      const closerId = m.closer_id;
      if (closerId) reunioesPorCloser[closerId] = (reunioesPorCloser[closerId] || 0) + 1;
    });
    const reunioesCloserArray = Object.entries(reunioesPorCloser).map(([id, qtd]) => ({
      nome: getProfileName(id),
      qtd,
    })).sort((a, b) => b.qtd - a.qtd);

    // Meta semanal de reuniões
    const metaReunioes = weeklyTargets?.[0]?.meta_reunioes || null;
    const percentualMetaReunioes = metaReunioes ? Math.round((totalRealizadas / metaReunioes) * 100) : 0;

    // --- 2. PROPOSTAS ENVIADAS ---
    const propostasEnviadasNoPeriodo = proposalsSentInPeriod || [];
    const totalPropostasEnviadas = propostasEnviadasNoPeriodo.length;

    const propostasEnviadasPorCloser: Record<string, number> = {};
    propostasEnviadasNoPeriodo.forEach((m) => {
      const closerId = m.closer_id;
      if (closerId) propostasEnviadasPorCloser[closerId] = (propostasEnviadasPorCloser[closerId] || 0) + 1;
    });
    const propostasEnviadasCloserArray = Object.entries(propostasEnviadasPorCloser).map(([id, qtd]) => ({
      nome: getProfileName(id),
      qtd,
    })).sort((a, b) => b.qtd - a.qtd);

    const propostasEnviadasOrigemArray: Array<{ origem: string; qtd: number }> = [];

    // --- 3. PROPOSTAS EM ABERTO ---
    const propostasEmAberto = pipelineMeetings || [];
    const totalPropostasEmAberto = propostasEmAberto.length;
    const valorBrutoEmAberto = propostasEmAberto.reduce((sum, m) => sum + (Number(m.valor_proposta) || 0), 0);

    const emAbertoPorCloser: Record<string, { qtd: number; valor: number }> = {};
    propostasEmAberto.forEach((m) => {
      const closerId = m.closer_id;
      if (!closerId) return;
      if (!emAbertoPorCloser[closerId]) emAbertoPorCloser[closerId] = { qtd: 0, valor: 0 };
      emAbertoPorCloser[closerId].qtd++;
      emAbertoPorCloser[closerId].valor += Number(m.valor_proposta) || 0;
    });
    const emAbertoCloserArray = Object.entries(emAbertoPorCloser).map(([id, data]) => ({
      nome: getProfileName(id),
      qtd: data.qtd,
      valor: data.valor,
    })).sort((a, b) => b.valor - a.valor);

    const emAbertoOrigemArray: Array<{ origem: string; qtd: number; valor: number }> = [];

    // --- 4. FECHAMENTOS ---
    const fechamentosList = closedMeetings || [];
    const totalFechamentos = fechamentosList.length;
    const valorFechamentoTotal = fechamentosList.reduce((sum, m) => sum + (Number(m.valor_fechamento) || 0), 0);

    const fechamentosPorCloser: Record<string, { qtd: number; valor_fechamento: number }> = {};
    fechamentosList.forEach((m) => {
      const closerId = m.closer_id;
      if (!closerId) return;
      if (!fechamentosPorCloser[closerId]) fechamentosPorCloser[closerId] = { qtd: 0, valor_fechamento: 0 };
      fechamentosPorCloser[closerId].qtd++;
      fechamentosPorCloser[closerId].valor_fechamento += Number(m.valor_fechamento) || 0;
    });
    const fechamentosCloserArray = Object.entries(fechamentosPorCloser).map(([id, data]) => ({
      nome: getProfileName(id),
      qtd: data.qtd,
      valor_fechamento: data.valor_fechamento,
    })).sort((a, b) => b.valor_fechamento - a.valor_fechamento);

    const fechamentosOrigemArray: Array<{ origem: string; qtd: number; valor_fechamento: number }> = [];

    // --- 5. METAS ---
    const metaValor = monthlyTargets?.[0]?.meta_valor || null;
    const metaContratos = weeklyTargets?.[0]?.meta_fechamentos || null;
    const percentualAtingimentoValor = metaValor 
      ? Math.round((valorFechamentoTotal / Number(metaValor)) * 100) 
      : 0;
    const percentualAtingimentoContratos = metaContratos 
      ? Math.round((totalFechamentos / metaContratos) * 100) 
      : 0;

    const metasSemanais = report_type === "WBR_SEMANAL" ? {
      meta_reunioes: metaReunioes,
      reunioes_realizadas: totalRealizadas,
      percentual_reunioes: percentualMetaReunioes,
      meta_contratos: metaContratos,
      contratos_fechados: totalFechamentos,
      percentual_contratos: percentualAtingimentoContratos,
    } : null;

    const metaMensal = report_type === "ANALISE_MENSAL" ? {
      meta_valor: metaValor ? Number(metaValor) : null,
      realizado: valorFechamentoTotal,
      percentual_atingimento: percentualAtingimentoValor,
      meta_contratos: null as number | null,
      contratos_fechados: totalFechamentos,
      percentual_contratos: 0,
    } : {
      meta_valor: null as number | null,
      realizado: valorFechamentoTotal,
      percentual_atingimento: 0,
      meta_contratos: null as number | null,
      contratos_fechados: totalFechamentos,
      percentual_contratos: 0,
    };

    // --- 6. TEMPO MÉDIO DE FECHAMENTO ---
    let tempoMedioFechamento: number | null = null;
    const fechamentosComDatas = fechamentosList.filter((m) => m.data_reuniao && m.data_fechamento);
    if (fechamentosComDatas.length > 0) {
      const totalDias = fechamentosComDatas.reduce((sum, m) => {
        const inicio = new Date(m.data_reuniao);
        const fechado = new Date(m.data_fechamento);
        const dias = Math.floor((fechado.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        return sum + dias;
      }, 0);
      tempoMedioFechamento = Math.round(totalDias / fechamentosComDatas.length);
    }

    // --- 7. FORECAST ---
    const in14Days = addDays(now, 14);
    const in30Days = addDays(now, 30);
    const in60Days = addDays(now, 60);

    let forecastPonderado = 0;
    let forecast14Dias = 0;
    let forecast30Dias = 0;
    let forecast60Dias = 0;
    const aging = { verde: 0, amarelo: 0, vermelho: 0 };

    propostasEmAberto.forEach((m) => {
      const valorProposta = Number(m.valor_proposta) || 0;
      const probability = 0.25; // default probability
      const weightedValue = valorProposta * probability;
      const expectedCloseDate = addDays(new Date(m.data_reuniao), 30);

      forecastPonderado += weightedValue;

      if (expectedCloseDate <= in14Days) forecast14Dias += weightedValue;
      if (expectedCloseDate <= in30Days) forecast30Dias += weightedValue;
      if (expectedCloseDate <= in60Days) forecast60Dias += weightedValue;

      const days = Math.floor((now.getTime() - new Date(m.data_reuniao).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 5) aging.verde++;
      else if (days <= 14) aging.amarelo++;
      else aging.vermelho++;
    });

    // =====================================================
    // 8. SDRs
    // =====================================================

    const reunioesPorSdr: Record<string, {
      total_agendadas: number;
      fechados: number;
      perdidos: number;
      proposta_enviada: number;
    }> = {};

    meetings?.forEach((m) => {
      const sdrId = m.sdr_id;
      if (!sdrId) return;
      if (!reunioesPorSdr[sdrId]) {
        reunioesPorSdr[sdrId] = {
          total_agendadas: 0,
          fechados: 0,
          perdidos: 0,
          proposta_enviada: 0,
        };
      }

      reunioesPorSdr[sdrId].total_agendadas++;

      if (m.status === "fechado") reunioesPorSdr[sdrId].fechados++;
      if (m.status === "perdido") reunioesPorSdr[sdrId].perdidos++;
      if (m.status === "proposta_enviada") reunioesPorSdr[sdrId].proposta_enviada++;
    });

    const sdrsArray = Object.entries(reunioesPorSdr).map(([id, data]) => {
      const total = data.total_agendadas;
      const baseConversao = data.proposta_enviada + data.fechados + data.perdidos;

      return {
        nome: getProfileName(id),
        total_agendadas: total,
        fechados: data.fechados,
        taxa_conversao: baseConversao > 0 ? Math.round((data.fechados / baseConversao) * 100) : 0,
      };
    }).sort((a, b) => b.total_agendadas - a.total_agendadas);

    // =====================================================
    // BUILD DADOS_FIXOS OBJECT
    // =====================================================

    const dadosFixos = {
      periodo: { inicio: date_start, fim: date_end },
      reunioes: {
        total_realizadas: totalRealizadas,
        meta_reunioes: metaReunioes,
        percentual_meta: percentualMetaReunioes,
        por_origem: reunioesOrigemArray,
        por_closer: reunioesCloserArray,
      },
      propostas_enviadas: {
        total: totalPropostasEnviadas,
        por_closer: propostasEnviadasCloserArray,
        por_origem: propostasEnviadasOrigemArray,
      },
      propostas_em_aberto: {
        total: totalPropostasEmAberto,
        valor_bruto: valorBrutoEmAberto,
        por_closer: emAbertoCloserArray,
        por_origem: emAbertoOrigemArray,
      },
      fechamentos: {
        total_contratos: totalFechamentos,
        valor_fechamento: valorFechamentoTotal,
        por_closer: fechamentosCloserArray,
        por_origem: fechamentosOrigemArray,
      },
      meta_mensal: metaMensal,
      metas_semanais: metasSemanais,
      tempo_medio_fechamento: tempoMedioFechamento,
      forecast: {
        valor_bruto_pipeline: valorBrutoEmAberto,
        forecast_ponderado: forecastPonderado,
        forecast_14_dias: forecast14Dias,
        forecast_30_dias: forecast30Dias,
        forecast_60_dias: forecast60Dias,
        aging,
      },
      sdrs: { por_sdr: sdrsArray },
    };

    // =====================================================
    // BUILD REPORT CONTEXT FOR AI
    // =====================================================

    const meetingsByStatus: Record<string, number> = {};
    meetings?.forEach((m) => {
      meetingsByStatus[m.status] = (meetingsByStatus[m.status] || 0) + 1;
    });

    const fechados = meetingsByStatus["fechado"] || 0;
    const perdidos = meetingsByStatus["perdido"] || 0;
    const propostaEnviada = meetingsByStatus["proposta_enviada"] || 0;
    const totalPropostas = propostaEnviada + fechados + perdidos;
    const taxaConversao = totalPropostas > 0 ? (fechados / totalPropostas) * 100 : 0;

    const totalMeetings = meetings?.length || 0;

    const reportContext = {
      periodo: { inicio: date_start, fim: date_end, tipo: report_type },
      summary_period: {
        total_meetings: totalMeetings,
        meetings_by_status: meetingsByStatus,
        reunioes_realizadas: totalRealizadas,
        fechamentos: totalFechamentos,
        valor_fechamento: valorFechamentoTotal,
        taxa_conversao: Math.round(taxaConversao * 100) / 100,
      },
      breakdowns: dadosFixos,
      pipeline: {
        total_propostas: totalPropostasEmAberto,
        valor_bruto_total: valorBrutoEmAberto,
        forecast_ponderado: forecastPonderado,
        forecast_14_dias: forecast14Dias,
        forecast_30_dias: forecast30Dias,
        forecast_60_dias: forecast60Dias,
        aging,
      },
      targets: {
        weekly: weeklyTargets?.[0] || null,
        monthly: monthlyTargets?.[0] || null,
        yearly: yearlyTargets?.[0] || null,
      },
      manual_inputs: manual_inputs || {},
    };

    // =====================================================
    // CALL OPENAI
    // =====================================================

    const model = premium_mode ? AI_MODEL_PREMIUM : AI_MODEL_DEFAULT;
    const reportTypeLabel = report_type === "WBR_SEMANAL" ? "WBR semanal" : "análise mensal";

    const systemPrompt = `Você é um analista comercial sênior brasileiro. Gere uma ANÁLISE QUALITATIVA baseada nos dados fornecidos.

IMPORTANTE: Os dados numéricos já são apresentados em uma seção fixa separada. Seu papel é INTERPRETAR os dados, não repetí-los.

REGRAS CRÍTICAS:
1. NÃO repita números exatos - eles já estão na seção fixa. Foque em ANÁLISES e INSIGHTS.
2. Compare performance entre closers, SDRs e origens de forma qualitativa
3. Identifique padrões e tendências
4. BRUTO vs LÍQUIDO: 
   - Realizado/Ganhos = valor_fechamento (LÍQUIDO)
   - Pipeline/Propostas em aberto = valor_bruto_total (BRUTO)
5. FORECAST:
   - Use probabilidade padrão de 25% para propostas em aberto
   - Analise o aging e sugira ações para propostas vermelhas (>14 dias)
6. LAG: Reuniões realizadas tendem a fechar nas semanas seguintes
7. METAS POR TIPO DE RELATÓRIO:
   - WBR Semanal: use as metas SEMANAIS
   - Análise Mensal: use a meta MENSAL de valor
8. Quando não houver dado, use null e liste em limitacoes_dos_dados
9. Hipóteses devem ser marcadas como "[HIPÓTESE]"
10. Seja objetivo: bullets curtos e ações executáveis (máximo 7 ações)

FORMATO DE SAÍDA (JSON estrito):
{
  "ata": {
    "periodo": "string",
    "resumo_executivo": "string",
    "metricas_principais": [
      { "metrica": "string", "valor": "string", "vs_meta": "string ou null" }
    ],
    "destaques_positivos": ["string"],
    "pontos_de_atencao": ["string"]
  },
  "analise_gestor": {
    "performance_geral": "string",
    "analise_por_closer": [
      { "nome": "string", "insight": "string" }
    ],
    "analise_pipeline": "string",
    "hipoteses": ["string"],
    "evidencias": ["string"]
  },
  "plano_de_acao": {
    "acoes": [
      {
        "id": "number",
        "acao": "string",
        "responsavel_sugerido": "string",
        "prazo": "string",
        "metrica_sucesso": "string"
      }
    ]
  },
  "limitacoes_dos_dados": ["string"],
  "checks_qualidade": {
    "campos_ausentes": ["string"],
    "inconsistencias": ["string"]
  }
}`;

    const userPrompt = `Gere a análise ${reportTypeLabel} com base nestes dados:

${JSON.stringify(reportContext, null, 2)}

Responda APENAS com JSON válido, sem markdown ou explicações adicionais.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to generate report with AI", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiContent = openaiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return new Response(
        JSON.stringify({ error: "No content returned from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let aiOutput;
    try {
      aiOutput = JSON.parse(aiContent);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: aiContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // SAVE TO HISTORY
    // =====================================================

    const { error: insertError } = await supabase
      .from("crm_wbr_ai_reports")
      .insert({
        semana_inicio: date_start,
        semana_fim: date_end,
        conteudo_markdown: JSON.stringify(aiOutput),
        modelo_usado: model,
        dados_fonte: { ...reportContext, dados_fixos: dadosFixos },
      });

    if (insertError) {
      console.error("Failed to save report:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: aiOutput,
        dados_fixos: dadosFixos,
        context: reportContext,
        model_used: model,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
