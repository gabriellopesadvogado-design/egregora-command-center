import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Model configuration
const AI_MODEL_DEFAULT = "gpt-4.1-mini";
const AI_MODEL_PREMIUM = "gpt-4.1";

// Probability map for forecast (same as /forecast module)
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

// Helper function
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate OpenAI API Key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client to verify the JWT
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract token and verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;

    // Create client with user context for RLS
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse request body
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
      .from("meetings")
      .select("*")
      .gte("inicio_em", `${date_start}T00:00:00`)
      .lte("inicio_em", `${date_end}T23:59:59`);

    if (meetingsError) throw meetingsError;

    // 2. Get closed meetings (ganhas) in period - by fechado_em date
    const { data: closedMeetings, error: closedError } = await supabase
      .from("meetings")
      .select("*")
      .eq("status", "ganha")
      .gte("fechado_em", `${date_start}T00:00:00`)
      .lte("fechado_em", `${date_end}T23:59:59`);

    if (closedError) throw closedError;

    // 3. Get profiles for name mapping
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nome, role");

    if (profilesError) throw profilesError;

    // 4. Get weekly targets for the period
    const { data: weeklyTargets, error: weeklyError } = await supabase
      .from("weekly_targets")
      .select("*")
      .lte("semana_inicio", date_end)
      .gte("semana_fim", date_start);

    if (weeklyError) throw weeklyError;

    // 5. Get monthly target
    const monthStart = date_start.substring(0, 7) + "-01";
    const { data: monthlyTargets, error: monthlyError } = await supabase
      .from("monthly_targets")
      .select("*")
      .eq("mes_ano", monthStart);

    if (monthlyError) throw monthlyError;

    // 6. Get yearly target
    const year = parseInt(date_start.substring(0, 4));
    const { data: yearlyTargets, error: yearlyError } = await supabase
      .from("yearly_targets")
      .select("*")
      .eq("ano", year);

    if (yearlyError) throw yearlyError;

    // 7. Get pipeline: ALL meetings with status proposta_enviada (full pipeline, not just period)
    const { data: pipelineMeetings, error: pipelineError } = await supabase
      .from("meetings")
      .select("*")
      .eq("status", "proposta_enviada");

    if (pipelineError) throw pipelineError;

    // 8. Get meetings with proposta_enviada in period (for proposals sent metric)
    const { data: proposalsSentInPeriod, error: proposalsSentError } = await supabase
      .from("meetings")
      .select("*")
      .eq("status", "proposta_enviada")
      .gte("inicio_em", `${date_start}T00:00:00`)
      .lte("inicio_em", `${date_end}T23:59:59`);

    if (proposalsSentError) throw proposalsSentError;

    // =====================================================
    // BUILD PROFILE MAP
    // =====================================================

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    const getProfileName = (id: string) => profileMap.get(id)?.nome || "Desconhecido";

    // =====================================================
    // CALCULATE DADOS_FIXOS (FIXED METRICS)
    // =====================================================

    const now = new Date();

    // --- 1. REUNIÕES REALIZADAS ---
    const realizadas = meetings?.filter((m) =>
      ["aconteceu", "proposta_enviada", "ganha", "perdida"].includes(m.status)
    ) || [];
    const totalRealizadas = realizadas.length;

    // Por origem
    const reunioesPorOrigem: Record<string, number> = {};
    realizadas.forEach((m) => {
      const origem = m.fonte_lead || "outros";
      reunioesPorOrigem[origem] = (reunioesPorOrigem[origem] || 0) + 1;
    });
    const reunioesOrigemArray = Object.entries(reunioesPorOrigem).map(([origem, qtd]) => ({
      origem,
      qtd,
      percentual: totalRealizadas > 0 ? Math.round((qtd / totalRealizadas) * 100) : 0,
    })).sort((a, b) => b.qtd - a.qtd);

    // Por closer
    const reunioesPorCloser: Record<string, number> = {};
    realizadas.forEach((m) => {
      const closerId = m.closer_id;
      reunioesPorCloser[closerId] = (reunioesPorCloser[closerId] || 0) + 1;
    });
    const reunioesCloserArray = Object.entries(reunioesPorCloser).map(([id, qtd]) => ({
      nome: getProfileName(id),
      qtd,
    })).sort((a, b) => b.qtd - a.qtd);

    // Meta semanal de reuniões
    const metaReunioes = weeklyTargets?.[0]?.meta_reunioes_realizadas || null;
    const percentualMetaReunioes = metaReunioes ? Math.round((totalRealizadas / metaReunioes) * 100) : 0;

    // --- 2. PROPOSTAS ENVIADAS (no período) ---
    const propostasEnviadasNoPeriodo = proposalsSentInPeriod || [];
    const totalPropostasEnviadas = propostasEnviadasNoPeriodo.length;

    // Por closer
    const propostasEnviadasPorCloser: Record<string, number> = {};
    propostasEnviadasNoPeriodo.forEach((m) => {
      const closerId = m.closer_id;
      propostasEnviadasPorCloser[closerId] = (propostasEnviadasPorCloser[closerId] || 0) + 1;
    });
    const propostasEnviadasCloserArray = Object.entries(propostasEnviadasPorCloser).map(([id, qtd]) => ({
      nome: getProfileName(id),
      qtd,
    })).sort((a, b) => b.qtd - a.qtd);

    // Por origem
    const propostasEnviadasPorOrigem: Record<string, number> = {};
    propostasEnviadasNoPeriodo.forEach((m) => {
      const origem = m.fonte_lead || "outros";
      propostasEnviadasPorOrigem[origem] = (propostasEnviadasPorOrigem[origem] || 0) + 1;
    });
    const propostasEnviadasOrigemArray = Object.entries(propostasEnviadasPorOrigem).map(([origem, qtd]) => ({
      origem,
      qtd,
    })).sort((a, b) => b.qtd - a.qtd);

    // --- 3. PROPOSTAS EM ABERTO (full pipeline) ---
    const propostasEmAberto = pipelineMeetings || [];
    const totalPropostasEmAberto = propostasEmAberto.length;
    const valorBrutoEmAberto = propostasEmAberto.reduce((sum, m) => sum + (Number(m.valor_proposta) || 0), 0);

    // Por closer
    const emAbertoPorCloser: Record<string, { qtd: number; valor: number }> = {};
    propostasEmAberto.forEach((m) => {
      const closerId = m.closer_id;
      if (!emAbertoPorCloser[closerId]) {
        emAbertoPorCloser[closerId] = { qtd: 0, valor: 0 };
      }
      emAbertoPorCloser[closerId].qtd++;
      emAbertoPorCloser[closerId].valor += Number(m.valor_proposta) || 0;
    });
    const emAbertoCloserArray = Object.entries(emAbertoPorCloser).map(([id, data]) => ({
      nome: getProfileName(id),
      qtd: data.qtd,
      valor: data.valor,
    })).sort((a, b) => b.valor - a.valor);

    // Por origem
    const emAbertoPorOrigem: Record<string, { qtd: number; valor: number }> = {};
    propostasEmAberto.forEach((m) => {
      const origem = m.fonte_lead || "outros";
      if (!emAbertoPorOrigem[origem]) {
        emAbertoPorOrigem[origem] = { qtd: 0, valor: 0 };
      }
      emAbertoPorOrigem[origem].qtd++;
      emAbertoPorOrigem[origem].valor += Number(m.valor_proposta) || 0;
    });
    const emAbertoOrigemArray = Object.entries(emAbertoPorOrigem).map(([origem, data]) => ({
      origem,
      qtd: data.qtd,
      valor: data.valor,
    })).sort((a, b) => b.valor - a.valor);

    // --- 4. FECHAMENTOS ---
    const fechamentosList = closedMeetings || [];
    const totalFechamentos = fechamentosList.length;
    const valorFechadoTotal = fechamentosList.reduce((sum, m) => sum + (Number(m.valor_fechado) || 0), 0);
    const caixaGeradoTotal = fechamentosList.reduce((sum, m) => sum + (Number(m.caixa_gerado) || 0), 0);

    // Por closer
    const fechamentosPorCloser: Record<string, { qtd: number; valor_fechado: number; caixa_gerado: number }> = {};
    fechamentosList.forEach((m) => {
      const closerId = m.closer_id;
      if (!fechamentosPorCloser[closerId]) {
        fechamentosPorCloser[closerId] = { qtd: 0, valor_fechado: 0, caixa_gerado: 0 };
      }
      fechamentosPorCloser[closerId].qtd++;
      fechamentosPorCloser[closerId].valor_fechado += Number(m.valor_fechado) || 0;
      fechamentosPorCloser[closerId].caixa_gerado += Number(m.caixa_gerado) || 0;
    });
    const fechamentosCloserArray = Object.entries(fechamentosPorCloser).map(([id, data]) => ({
      nome: getProfileName(id),
      qtd: data.qtd,
      valor_fechado: data.valor_fechado,
      caixa_gerado: data.caixa_gerado,
    })).sort((a, b) => b.valor_fechado - a.valor_fechado);

    // Por origem
    const fechamentosPorOrigem: Record<string, { qtd: number; valor_fechado: number }> = {};
    fechamentosList.forEach((m) => {
      const origem = m.fonte_lead || "outros";
      if (!fechamentosPorOrigem[origem]) {
        fechamentosPorOrigem[origem] = { qtd: 0, valor_fechado: 0 };
      }
      fechamentosPorOrigem[origem].qtd++;
      fechamentosPorOrigem[origem].valor_fechado += Number(m.valor_fechado) || 0;
    });
    const fechamentosOrigemArray = Object.entries(fechamentosPorOrigem).map(([origem, data]) => ({
      origem,
      qtd: data.qtd,
      valor_fechado: data.valor_fechado,
    })).sort((a, b) => b.valor_fechado - a.valor_fechado);

    // --- 5. METAS (condicionais por tipo de relatório) ---
    const metaFaturamento = monthlyTargets?.[0]?.meta_faturamento || null;
    const metaContratos = weeklyTargets?.[0]?.meta_fechamentos_qtd || null;
    const percentualAtingimentoFaturamento = metaFaturamento 
      ? Math.round((valorFechadoTotal / Number(metaFaturamento)) * 100) 
      : 0;
    const percentualAtingimentoContratos = metaContratos 
      ? Math.round((totalFechamentos / metaContratos) * 100) 
      : 0;

    // Build metas_semanais ONLY for WBR_SEMANAL
    const metasSemanais = report_type === "WBR_SEMANAL" ? {
      meta_reunioes: metaReunioes,
      reunioes_realizadas: totalRealizadas,
      percentual_reunioes: percentualMetaReunioes,
      meta_contratos: metaContratos,
      contratos_fechados: totalFechamentos,
      percentual_contratos: percentualAtingimentoContratos,
    } : null;

    // meta_mensal: full data only for ANALISE_MENSAL, nullified for WBR_SEMANAL
    const metaMensal = report_type === "ANALISE_MENSAL" ? {
      meta_faturamento: metaFaturamento ? Number(metaFaturamento) : null,
      realizado: valorFechadoTotal,
      percentual_atingimento: percentualAtingimentoFaturamento,
      meta_contratos: null as number | null,
      contratos_fechados: totalFechamentos,
      percentual_contratos: 0,
    } : {
      meta_faturamento: null as number | null,
      realizado: valorFechadoTotal,
      percentual_atingimento: 0,
      meta_contratos: null as number | null,
      contratos_fechados: totalFechamentos,
      percentual_contratos: 0,
    };

    // --- 6. TEMPO MÉDIO DE FECHAMENTO ---
    let tempoMedioFechamento: number | null = null;
    const fechamentosComDatas = fechamentosList.filter((m) => m.inicio_em && m.fechado_em);
    if (fechamentosComDatas.length > 0) {
      const totalDias = fechamentosComDatas.reduce((sum, m) => {
        const inicio = new Date(m.inicio_em);
        const fechado = new Date(m.fechado_em);
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
      const probability = m.avaliacao_reuniao ? PROBABILITY_MAP[m.avaliacao_reuniao] || 0 : 0;
      const weightedValue = valorProposta * probability;
      const expectedCloseDate = addDays(new Date(m.inicio_em), 30);

      forecastPonderado += weightedValue;

      // Forecast por período
      if (expectedCloseDate <= in14Days) forecast14Dias += weightedValue;
      if (expectedCloseDate <= in30Days) forecast30Dias += weightedValue;
      if (expectedCloseDate <= in60Days) forecast60Dias += weightedValue;

      // Aging
      const days = Math.floor((now.getTime() - new Date(m.inicio_em).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 5) aging.verde++;
      else if (days <= 14) aging.amarelo++;
      else aging.vermelho++;
    });

    // =====================================================
    // 8. SDRs
    // =====================================================

    const reunioesPorSdr: Record<string, {
      total_agendadas: number;
      no_shows: number;
      ganhas: number;
      perdidas: number;
      proposta_enviada: number;
      qualidade: { boa: number; neutra: number; ruim: number };
    }> = {};

    // Process ALL meetings (not just realizadas)
    meetings?.forEach((m) => {
      const sdrId = m.sdr_id;
      if (!reunioesPorSdr[sdrId]) {
        reunioesPorSdr[sdrId] = {
          total_agendadas: 0,
          no_shows: 0,
          ganhas: 0,
          perdidas: 0,
          proposta_enviada: 0,
          qualidade: { boa: 0, neutra: 0, ruim: 0 },
        };
      }

      reunioesPorSdr[sdrId].total_agendadas++;

      if (m.status === "no_show") reunioesPorSdr[sdrId].no_shows++;
      if (m.status === "ganha") reunioesPorSdr[sdrId].ganhas++;
      if (m.status === "perdida") reunioesPorSdr[sdrId].perdidas++;
      if (m.status === "proposta_enviada") reunioesPorSdr[sdrId].proposta_enviada++;

      const qual = m.avaliacao_reuniao as "boa" | "neutra" | "ruim" | null;
      if (qual && reunioesPorSdr[sdrId].qualidade[qual] !== undefined) {
        reunioesPorSdr[sdrId].qualidade[qual]++;
      }
    });

    // Convert to array with names and rates
    const sdrsArray = Object.entries(reunioesPorSdr).map(([id, data]) => {
      const total = data.total_agendadas;
      const baseConversao = data.proposta_enviada + data.ganhas + data.perdidas;

      return {
        nome: getProfileName(id),
        total_agendadas: total,
        ganhas: data.ganhas,
        taxa_conversao: baseConversao > 0 ? Math.round((data.ganhas / baseConversao) * 100) : 0,
        no_shows: data.no_shows,
        taxa_no_show: total > 0 ? Math.round((data.no_shows / total) * 100) : 0,
        qualidade: data.qualidade,
        percentual_qualidade: {
          boa: total > 0 ? Math.round((data.qualidade.boa / total) * 100) : 0,
          neutra: total > 0 ? Math.round((data.qualidade.neutra / total) * 100) : 0,
          ruim: total > 0 ? Math.round((data.qualidade.ruim / total) * 100) : 0,
        },
      };
    }).sort((a, b) => b.total_agendadas - a.total_agendadas);

    // =====================================================
    // BUILD DADOS_FIXOS OBJECT
    // =====================================================

    const dadosFixos = {
      periodo: {
        inicio: date_start,
        fim: date_end,
      },
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
        valor_fechado: valorFechadoTotal,
        caixa_gerado: caixaGeradoTotal,
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
      sdrs: {
        por_sdr: sdrsArray,
      },
    };

    // =====================================================
    // BUILD REPORT CONTEXT FOR AI
    // =====================================================

    // Meetings by status
    const meetingsByStatus: Record<string, number> = {};
    const meetingsByQuality: Record<string, number> = { boa: 0, neutra: 0, ruim: 0 };
    let totalNoShow = 0;
    let totalCanceladas = 0;

    meetings?.forEach((m) => {
      meetingsByStatus[m.status] = (meetingsByStatus[m.status] || 0) + 1;
      if (m.status === "no_show") totalNoShow++;
      if (m.status === "cancelada") totalCanceladas++;
      if (m.avaliacao_reuniao) {
        meetingsByQuality[m.avaliacao_reuniao] = (meetingsByQuality[m.avaliacao_reuniao] || 0) + 1;
      }
    });

    // Taxa de conversão
    const ganhas = meetingsByStatus["ganha"] || 0;
    const perdidas = meetingsByStatus["perdida"] || 0;
    const propostaEnviada = meetingsByStatus["proposta_enviada"] || 0;
    const totalPropostas = propostaEnviada + ganhas + perdidas;
    const taxaConversao = totalPropostas > 0 ? (ganhas / totalPropostas) * 100 : 0;

    // Taxa de no-show
    const totalMeetings = meetings?.length || 0;
    const taxaNoShow = totalMeetings > 0 ? (totalNoShow / totalMeetings) * 100 : 0;

    const reportContext = {
      periodo: {
        inicio: date_start,
        fim: date_end,
        tipo: report_type,
      },
      summary_period: {
        total_meetings: totalMeetings,
        meetings_by_status: meetingsByStatus,
        reunioes_realizadas: totalRealizadas,
        fechamentos: totalFechamentos,
        valor_fechado: valorFechadoTotal,
        caixa_gerado: caixaGeradoTotal,
        taxa_conversao: Math.round(taxaConversao * 100) / 100,
        taxa_no_show: Math.round(taxaNoShow * 100) / 100,
        quality_distribution: meetingsByQuality,
        total_no_show: totalNoShow,
        total_canceladas: totalCanceladas,
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
   - Realizado/Ganhos = valor_fechado (LÍQUIDO)
   - Pipeline/Propostas em aberto = valor_bruto_total (BRUTO)
5. FORECAST:
   - Probabilidades: Muito Bom (boa)=50%, Bom (neutra)=25%, Ruim=10%
   - Analise o aging e sugira ações para propostas vermelhas (>14 dias)
6. LAG: Reuniões realizadas tendem a fechar nas semanas seguintes
7. METAS POR TIPO DE RELATÓRIO:
   - WBR Semanal: use as metas SEMANAIS (reuniões realizadas e contratos fechados da weekly_targets)
   - Análise Mensal: use a meta MENSAL de faturamento (monthly_targets)
7. Quando não houver dado, use null e liste em limitacoes_dos_dados
8. Hipóteses devem ser marcadas como "[HIPÓTESE]"
9. Seja objetivo: bullets curtos e ações executáveis (máximo 7 ações)

ANÁLISE DE SDRs (OBRIGATÓRIO):
Responda estas perguntas com base nos dados de sdrs.por_sdr:
- Qual SDR teve mais reuniões convertidas em venda (ganhas)?
- Compare as taxas de No Show por SDR - alta taxa pode indicar problema de qualificação do lead
- Qual SDR agendou mais reuniões no período?
- Analise a qualidade das reuniões por SDR (boa/neutra/ruim):
  * SDRs com muitas reuniões "ruim" podem estar priorizando quantidade sobre qualidade
  * SDRs com reuniões "boa" mas sem fechamentos podem indicar problema no closer
  * Identifique padrões de qualidade e sugira ações específicas

FORMATO DE SAÍDA (JSON estrito):
{
  "ata": {
    "periodo": "string (ex: 27/01 a 02/02/2025)",
    "resumo_executivo": "string (2-3 frases com análise qualitativa, não números)",
    "metricas_principais": [
      { "metrica": "string", "valor": "string", "vs_meta": "string ou null" }
    ],
    "destaques_positivos": ["string"],
    "pontos_de_atencao": ["string"]
  },
  "analise_gestor": {
    "performance_geral": "string (análise qualitativa em parágrafo)",
    "analise_por_fonte": [
      { "fonte": "string", "insight": "string (análise qualitativa)" }
    ],
    "analise_por_sdr": [
      { "nome": "string", "insight": "string (análise qualitativa sobre conversão, no-show e qualidade)" }
    ],
    "analise_por_closer": [
      { "nome": "string", "insight": "string (análise qualitativa)" }
    ],
    "analise_pipeline": "string (análise do pipeline com aging E forecast)",
    "hipoteses": ["string (marcadas com [HIPÓTESE])"],
    "evidencias": ["string (fatos baseados nos dados)"]
  },
  "plano_de_acao": {
    "acoes": [
      {
        "id": "number",
        "acao": "string (ação específica e executável)",
        "responsavel_sugerido": "string (nome do closer/SDR específico ou cargo)",
        "prazo": "string (Esta semana/Próxima semana/Este mês)",
        "metrica_sucesso": "string"
      }
    ]
  },
  "limitacoes_dos_dados": ["string (dados ausentes ou incompletos)"],
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
      .from("wbr_ai_reports")
      .insert({
        report_type,
        date_start,
        date_end,
        premium_mode,
        manual_inputs_json: manual_inputs,
        report_context_snapshot: { ...reportContext, dados_fixos: dadosFixos },
        ai_output_json: aiOutput,
        created_by: userId,
      });

    if (insertError) {
      console.error("Failed to save report:", insertError);
      // Don't fail the request, just log it
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
