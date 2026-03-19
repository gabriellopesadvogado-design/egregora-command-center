import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, differenceInDays, format } from "date-fns";

export type PeriodFilter = "today" | "week" | "month" | "custom";

interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(period: PeriodFilter, customRange?: DateRange): DateRange {
  const now = new Date();
  
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "custom":
      return customRange || { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }
}

export function useDashboardStats(period: PeriodFilter, customRange?: DateRange) {
  const { start, end } = getDateRange(period, customRange);

  return useQuery({
    queryKey: ["dashboard-stats", period, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      // Fetch meetings in period (by inicio_em) for reuniões and propostas
      const { data: meetings, error: meetingsError } = await supabase
        .from("meetings")
        .select("id, status, avaliacao_reuniao, closer_id, valor_fechado, caixa_gerado")
        .gte("inicio_em", start.toISOString())
        .lte("inicio_em", end.toISOString());

      if (meetingsError) throw meetingsError;

      // Query separada para fechamentos filtrados por fechado_em
      const { data: fechamentosMeetings, error: fechamentosError } = await supabase
        .from("meetings")
        .select("id, closer_id, valor_fechado, caixa_gerado")
        .eq("status", "ganha")
        .gte("fechado_em", start.toISOString())
        .lte("fechado_em", end.toISOString());

      if (fechamentosError) throw fechamentosError;

      // Reuniões realizadas = aconteceu, proposta_enviada, ganha ou perdida
      const realizadas = meetings?.filter((m) => 
        ["aconteceu", "proposta_enviada", "ganha", "perdida"].includes(m.status)
      ) || [];
      
      const qualityDistribution = {
        boa: realizadas.filter((m) => m.avaliacao_reuniao === "boa").length,
        neutra: realizadas.filter((m) => m.avaliacao_reuniao === "neutra").length,
        ruim: realizadas.filter((m) => m.avaliacao_reuniao === "ruim").length,
      };

      // Fechamentos derivados da query por fechado_em
      const fechamentos = fechamentosMeetings || [];
      const totalValorFechado = fechamentos.reduce((sum, m) => sum + (m.valor_fechado || 0), 0);
      const totalCaixaGerado = fechamentos.reduce((sum, m) => sum + (m.caixa_gerado || 0), 0);

      // Ticket médio: valor fechado / quantidade de fechamentos no período
      const ticketMedio = fechamentos.length > 0 ? totalValorFechado / fechamentos.length : 0;

      // Rolling: últimas 20 propostas resolvidas (ganha ou perdida)
      const { data: rollingResolved } = await supabase
        .from("meetings")
        .select("status")
        .in("status", ["ganha", "perdida"])
        .not("fechado_em", "is", null)
        .order("fechado_em", { ascending: false })
        .limit(20);

      const rollingTotal = rollingResolved?.length || 0;
      const rollingGanhas = rollingResolved?.filter((m) => m.status === "ganha").length || 0;
      const taxaConversao = rollingTotal > 0 ? (rollingGanhas / rollingTotal) * 100 : 0;

      // Rolling: ciclo de venda (últimas 20 ganhas)
      const { data: rollingWins } = await supabase
        .from("meetings")
        .select("inicio_em, fechado_em")
        .eq("status", "ganha")
        .not("fechado_em", "is", null)
        .order("fechado_em", { ascending: false })
        .limit(20);

      let cicloVenda = 0;
      if (rollingWins && rollingWins.length > 0) {
        const totalDias = rollingWins.reduce((sum, m) => {
          const diff = differenceInDays(new Date(m.fechado_em!), new Date(m.inicio_em));
          return sum + Math.max(diff, 0);
        }, 0);
        cicloVenda = totalDias / rollingWins.length;
      }

      return {
        reunioesRealizadas: realizadas.length,
        qualityDistribution,
        fechamentos: fechamentos.length,
        taxaConversao,
        ticketMedio,
        cicloVenda,
        valorFechado: totalValorFechado,
        caixaGerado: totalCaixaGerado,
        // Raw data for rankings
        meetings: meetings || [],
      };
    },
  });
}

export function useWeeklyTarget() {
  return useQuery({
    queryKey: ["weekly-target"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Get current week target
      const { data: target, error: targetError } = await supabase
        .from("weekly_targets")
        .select("*")
        .lte("semana_inicio", today)
        .gte("semana_fim", today)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (targetError) throw targetError;

      if (!target) {
        return null;
      }

      // Get won meetings this week (status = ganha)
      const { data: wonMeetings, error: meetingsError } = await supabase
        .from("meetings")
        .select("id, valor_fechado")
        .eq("status", "ganha")
        .gte("fechado_em", target.semana_inicio)
        .lte("fechado_em", target.semana_fim + "T23:59:59");

      if (meetingsError) throw meetingsError;

      // Get realized meetings this week (aconteceu, proposta_enviada, ganha, perdida)
      const { data: realizedMeetings, error: realizedError } = await supabase
        .from("meetings")
        .select("id")
        .in("status", ["aconteceu", "proposta_enviada", "ganha", "perdida"])
        .gte("inicio_em", target.semana_inicio + "T00:00:00")
        .lte("inicio_em", target.semana_fim + "T23:59:59");

      if (realizedError) throw realizedError;

      const fechamentosQtd = wonMeetings?.length || 0;
      const fechamentosValor = wonMeetings?.reduce((sum, m) => sum + (m.valor_fechado || 0), 0) || 0;
      const reunioesRealizadas = realizedMeetings?.length || 0;

      const progressoQtd = target.meta_fechamentos_qtd > 0
        ? (fechamentosQtd / target.meta_fechamentos_qtd) * 100
        : 0;

      const progressoValor = target.meta_fechamentos_valor && target.meta_fechamentos_valor > 0
        ? (fechamentosValor / target.meta_fechamentos_valor) * 100
        : null;

      const progressoReunioes = target.meta_reunioes_realizadas && target.meta_reunioes_realizadas > 0
        ? (reunioesRealizadas / target.meta_reunioes_realizadas) * 100
        : 0;

      return {
        target,
        reunioes: {
          atual: reunioesRealizadas,
          meta: target.meta_reunioes_realizadas || 0,
          progresso: progressoReunioes,
        },
        fechamentos: {
          atual: fechamentosQtd,
          meta: target.meta_fechamentos_qtd,
          progresso: progressoQtd,
          valor: fechamentosValor,
          valorMeta: target.meta_fechamentos_valor,
        },
      };
    },
  });
}

export function useRankings(period: PeriodFilter, customRange?: DateRange) {
  const { start, end } = getDateRange(period, customRange);

  return useQuery({
    queryKey: ["rankings", period, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      // Query separada para closers: filtra por fechado_em (data de fechamento)
      const { data: closerMeetings } = await supabase
        .from("meetings")
        .select("id, closer_id, valor_fechado")
        .eq("status", "ganha")
        .gte("fechado_em", start.toISOString())
        .lte("fechado_em", end.toISOString());

      // Query separada para SDRs: filtra por inicio_em (data da reunião)
      const { data: sdrMeetings } = await supabase
        .from("meetings")
        .select("id, status, sdr_id")
        .gte("inicio_em", start.toISOString())
        .lte("inicio_em", end.toISOString());

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, role");

      // Build closer rankings from meetings with status "ganha" filtered by fechado_em
      const closerMap = new Map<string, { nome: string; fechamentos: number; valor: number }>();
      
      (closerMeetings || []).forEach((m) => {
        const existing = closerMap.get(m.closer_id) || { nome: "", fechamentos: 0, valor: 0 };
        existing.fechamentos += 1;
        existing.valor += m.valor_fechado || 0;
        closerMap.set(m.closer_id, existing);
      });

      // Add names
      profiles?.forEach((p) => {
        if (closerMap.has(p.id)) {
          closerMap.get(p.id)!.nome = p.nome;
        }
      });

      const closerRankings = Array.from(closerMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.fechamentos - a.fechamentos);

      // Build SDR rankings from meetings filtered by inicio_em
      const sdrMap = new Map<string, { nome: string; agendadas: number; acontecidas: number }>();

      (sdrMeetings || []).forEach((m) => {
        const existing = sdrMap.get(m.sdr_id) || { nome: "", agendadas: 0, acontecidas: 0 };
        existing.agendadas += 1;
        if (["aconteceu", "proposta_enviada", "ganha", "perdida"].includes(m.status)) {
          existing.acontecidas += 1;
        }
        sdrMap.set(m.sdr_id, existing);
      });

      // Add names
      profiles?.forEach((p) => {
        if (sdrMap.has(p.id)) {
          sdrMap.get(p.id)!.nome = p.nome;
        }
      });

      const sdrRankings = Array.from(sdrMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.acontecidas - a.acontecidas);

      return {
        closers: closerRankings,
        sdrs: sdrRankings,
      };
    },
  });
}

export function useMonthlyTargetProgress() {
  return useQuery({
    queryKey: ["monthly-target-progress"],
    queryFn: async () => {
      // Get current month's first day in YYYY-MM-DD format
      const mesAtual = format(new Date(), "yyyy-MM-01");
      
      // Fetch target for current month
      const { data: target, error: targetError } = await supabase
        .from("monthly_targets")
        .select("*")
        .eq("mes_ano", mesAtual)
        .maybeSingle();

      if (targetError) throw targetError;

      // Fetch won meetings (fechamentos) for current month
      const inicioMes = startOfMonth(new Date());
      const fimMes = endOfMonth(new Date());
      
      const { data: fechamentos, error: fechamentosError } = await supabase
        .from("meetings")
        .select("id, valor_fechado")
        .eq("status", "ganha")
        .gte("fechado_em", inicioMes.toISOString())
        .lte("fechado_em", fimMes.toISOString());

      if (fechamentosError) throw fechamentosError;

      // Calculate totals
      const valorAtual = fechamentos?.reduce(
        (sum, m) => sum + (m.valor_fechado || 0), 
        0
      ) || 0;

      const progresso = target?.meta_faturamento 
        ? (valorAtual / target.meta_faturamento) * 100
        : 0;

      return {
        target,
        valorAtual,
        qtdFechamentos: fechamentos?.length || 0,
        progresso,
        diasRestantes: differenceInDays(fimMes, new Date()),
      };
    },
  });
}
