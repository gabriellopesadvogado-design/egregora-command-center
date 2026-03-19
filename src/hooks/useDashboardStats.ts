import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, format } from "date-fns";

export type PeriodFilter = "today" | "week" | "month" | "custom";

interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(period: PeriodFilter, customRange?: DateRange): DateRange {
  const now = new Date();
  switch (period) {
    case "today": return { start: startOfDay(now), end: endOfDay(now) };
    case "week": return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
    case "custom": return customRange || { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }
}

export function useDashboardStats(period: PeriodFilter, customRange?: DateRange) {
  const { start, end } = getDateRange(period, customRange);

  return useQuery({
    queryKey: ["dashboard-stats", period, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data: meetings, error: meetingsError } = await supabase
        .from("crm_meetings")
        .select("id, status, closer_id, valor_fechamento")
        .gte("data_reuniao", start.toISOString())
        .lte("data_reuniao", end.toISOString());

      if (meetingsError) throw meetingsError;

      const { data: fechamentosMeetings, error: fechamentosError } = await supabase
        .from("crm_meetings")
        .select("id, closer_id, valor_fechamento")
        .eq("status", "fechado")
        .gte("data_fechamento", start.toISOString())
        .lte("data_fechamento", end.toISOString());

      if (fechamentosError) throw fechamentosError;

      const realizadas = meetings?.filter((m) =>
        ["reuniao_realizada", "proposta_enviada", "fechado", "perdido"].includes(m.status)
      ) || [];

      const qualityDistribution = { boa: 0, neutra: realizadas.length, ruim: 0 };

      const fechamentos = fechamentosMeetings || [];
      const totalValorFechado = fechamentos.reduce((sum, m) => sum + (m.valor_fechamento || 0), 0);
      const ticketMedio = fechamentos.length > 0 ? totalValorFechado / fechamentos.length : 0;

      const { data: rollingResolved } = await supabase
        .from("crm_meetings")
        .select("status")
        .in("status", ["fechado", "perdido"])
        .not("data_fechamento", "is", null)
        .order("data_fechamento", { ascending: false })
        .limit(20);

      const rollingTotal = rollingResolved?.length || 0;
      const rollingGanhas = rollingResolved?.filter((m) => m.status === "fechado").length || 0;
      const taxaConversao = rollingTotal > 0 ? (rollingGanhas / rollingTotal) * 100 : 0;

      const { data: rollingWins } = await supabase
        .from("crm_meetings")
        .select("data_reuniao, data_fechamento")
        .eq("status", "fechado")
        .not("data_fechamento", "is", null)
        .order("data_fechamento", { ascending: false })
        .limit(20);

      let cicloVenda = 0;
      if (rollingWins && rollingWins.length > 0) {
        const totalDias = rollingWins.reduce((sum, m) => {
          const diff = differenceInDays(new Date(m.data_fechamento!), new Date(m.data_reuniao!));
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
        caixaGerado: 0,
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

      const { data: target, error: targetError } = await supabase
        .from("crm_weekly_targets")
        .select("*")
        .lte("semana_inicio", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (targetError) throw targetError;
      if (!target) return null;

      const { data: wonMeetings, error: meetingsError } = await supabase
        .from("crm_meetings")
        .select("id, valor_fechamento")
        .eq("status", "fechado")
        .gte("data_fechamento", target.semana_inicio);

      if (meetingsError) throw meetingsError;

      const { data: realizedMeetings, error: realizedError } = await supabase
        .from("crm_meetings")
        .select("id")
        .in("status", ["reuniao_realizada", "proposta_enviada", "fechado", "perdido"])
        .gte("data_reuniao", target.semana_inicio + "T00:00:00");

      if (realizedError) throw realizedError;

      const fechamentosQtd = wonMeetings?.length || 0;
      const fechamentosValor = wonMeetings?.reduce((sum, m) => sum + (m.valor_fechamento || 0), 0) || 0;
      const reunioesRealizadas = realizedMeetings?.length || 0;

      const progressoQtd = (target.meta_fechamentos || 0) > 0 ? (fechamentosQtd / (target.meta_fechamentos || 1)) * 100 : 0;
      const progressoValor = (target.meta_valor || 0) > 0 ? (fechamentosValor / (target.meta_valor || 1)) * 100 : null;
      const progressoReunioes = (target.meta_reunioes || 0) > 0 ? (reunioesRealizadas / (target.meta_reunioes || 1)) * 100 : 0;

      return {
        target: {
          ...target,
          meta_reunioes_realizadas: target.meta_reunioes,
          meta_fechamentos_qtd: target.meta_fechamentos,
          meta_fechamentos_valor: target.meta_valor,
        },
        reunioes: { atual: reunioesRealizadas, meta: target.meta_reunioes || 0, progresso: progressoReunioes },
        fechamentos: { atual: fechamentosQtd, meta: target.meta_fechamentos || 0, progresso: progressoQtd, valor: fechamentosValor, valorMeta: target.meta_valor },
      };
    },
  });
}

export function useRankings(period: PeriodFilter, customRange?: DateRange) {
  const { start, end } = getDateRange(period, customRange);

  return useQuery({
    queryKey: ["rankings", period, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data: closerMeetings } = await supabase
        .from("crm_meetings")
        .select("id, closer_id, valor_fechamento")
        .eq("status", "fechado")
        .gte("data_fechamento", start.toISOString())
        .lte("data_fechamento", end.toISOString());

      const { data: sdrMeetings } = await supabase
        .from("crm_meetings")
        .select("id, status, sdr_id")
        .gte("data_reuniao", start.toISOString())
        .lte("data_reuniao", end.toISOString());

      const { data: profiles } = await supabase
        .from("core_users")
        .select("id, nome, cargo");

      const closerMap = new Map<string, { nome: string; fechamentos: number; valor: number }>();
      (closerMeetings || []).forEach((m) => {
        if (!m.closer_id) return;
        const existing = closerMap.get(m.closer_id) || { nome: "", fechamentos: 0, valor: 0 };
        existing.fechamentos += 1;
        existing.valor += m.valor_fechamento || 0;
        closerMap.set(m.closer_id, existing);
      });

      profiles?.forEach((p) => {
        if (closerMap.has(p.id)) closerMap.get(p.id)!.nome = p.nome;
      });

      const closerRankings = Array.from(closerMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.fechamentos - a.fechamentos);

      const sdrMap = new Map<string, { nome: string; agendadas: number; acontecidas: number }>();
      (sdrMeetings || []).forEach((m) => {
        if (!m.sdr_id) return;
        const existing = sdrMap.get(m.sdr_id) || { nome: "", agendadas: 0, acontecidas: 0 };
        existing.agendadas += 1;
        if (["reuniao_realizada", "proposta_enviada", "fechado", "perdido"].includes(m.status)) {
          existing.acontecidas += 1;
        }
        sdrMap.set(m.sdr_id, existing);
      });

      profiles?.forEach((p) => {
        if (sdrMap.has(p.id)) sdrMap.get(p.id)!.nome = p.nome;
      });

      const sdrRankings = Array.from(sdrMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.acontecidas - a.acontecidas);

      return { closers: closerRankings, sdrs: sdrRankings };
    },
  });
}

export function useMonthlyTargetProgress() {
  return useQuery({
    queryKey: ["monthly-target-progress"],
    queryFn: async () => {
      const mesAtual = format(new Date(), "yyyy-MM-01");
      
      const { data: target, error: targetError } = await supabase
        .from("crm_monthly_targets")
        .select("*")
        .eq("mes", mesAtual)
        .maybeSingle();

      if (targetError) throw targetError;

      const inicioMes = startOfMonth(new Date());
      const fimMes = endOfMonth(new Date());
      
      const { data: fechamentos, error: fechamentosError } = await supabase
        .from("crm_meetings")
        .select("id, valor_fechamento")
        .eq("status", "fechado")
        .gte("data_fechamento", inicioMes.toISOString())
        .lte("data_fechamento", fimMes.toISOString());

      if (fechamentosError) throw fechamentosError;

      const valorAtual = fechamentos?.reduce((sum, m) => sum + (m.valor_fechamento || 0), 0) || 0;
      const progresso = target?.meta_valor ? (valorAtual / target.meta_valor) * 100 : 0;

      return {
        target: target ? { ...target, meta_faturamento: target.meta_valor, mes_ano: target.mes } : null,
        valorAtual,
        qtdFechamentos: fechamentos?.length || 0,
        progresso,
        diasRestantes: differenceInDays(fimMes, new Date()),
      };
    },
  });
}
