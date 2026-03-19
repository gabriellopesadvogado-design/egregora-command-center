import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { endOfMonth, format } from "date-fns";

export interface WeeklyTarget {
  id: string;
  semana_inicio: string;
  semana_fim: string;
  meta_reunioes_realizadas: number;
  meta_fechamentos_qtd: number;
  meta_fechamentos_valor: number | null;
  criado_por: string;
  criado_em: string;
  profiles?: { nome: string };
}

export interface MonthlyTarget {
  id: string;
  mes_ano: string;
  meta_faturamento: number;
  criado_por: string;
  criado_em: string;
  profiles?: { nome: string };
}

export interface YearlyTarget {
  id: string;
  ano: number;
  meta_faturamento: number;
  criado_por: string;
  criado_em: string;
}

export function useWeeklyTargets() {
  return useQuery({
    queryKey: ["weekly-targets-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_weekly_targets")
        .select("*")
        .order("semana_inicio", { ascending: false })
        .limit(20);

      if (error) throw error;
      return ((data || []) as any[]).map((t) => ({
        id: t.id,
        semana_inicio: t.semana_inicio,
        semana_fim: t.semana_inicio, // No semana_fim in new schema
        meta_reunioes_realizadas: t.meta_reunioes || 0,
        meta_fechamentos_qtd: t.meta_fechamentos || 0,
        meta_fechamentos_valor: t.meta_valor,
        criado_por: t.user_id || "",
        criado_em: t.created_at,
      })) as WeeklyTarget[];
    },
  });
}

export function useMonthlyTargets() {
  return useQuery({
    queryKey: ["monthly-targets-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_monthly_targets")
        .select("*")
        .order("mes", { ascending: false })
        .limit(12);

      if (error) throw error;
      return ((data || []) as any[]).map((t) => ({
        id: t.id,
        mes_ano: t.mes,
        meta_faturamento: t.meta_valor || 0,
        criado_por: t.user_id || "",
        criado_em: t.created_at,
      })) as MonthlyTarget[];
    },
  });
}

export function useWeeklyTargetByWeek(semanaInicio: string, _semanaFim: string) {
  return useQuery({
    queryKey: ["weekly-target", semanaInicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_weekly_targets")
        .select("*")
        .eq("semana_inicio", semanaInicio)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        semana_inicio: data.semana_inicio,
        semana_fim: data.semana_inicio,
        meta_reunioes_realizadas: data.meta_reunioes || 0,
        meta_fechamentos_qtd: data.meta_fechamentos || 0,
        meta_fechamentos_valor: data.meta_valor,
        criado_por: data.user_id || "",
        criado_em: data.created_at,
      } as WeeklyTarget;
    },
  });
}

export function useMonthlyTargetByMonth(mesAno: string) {
  return useQuery({
    queryKey: ["monthly-target", mesAno],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_monthly_targets")
        .select("*")
        .eq("mes", mesAno)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        mes_ano: data.mes,
        meta_faturamento: data.meta_valor || 0,
        criado_por: data.user_id || "",
        criado_em: data.created_at,
      } as MonthlyTarget;
    },
  });
}

interface CreateWeeklyTargetInput {
  semana_inicio: string;
  semana_fim: string;
  meta_reunioes_realizadas: number;
  meta_fechamentos_qtd: number;
  meta_fechamentos_valor?: number | null;
}

export function useCreateWeeklyTarget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateWeeklyTargetInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("crm_weekly_targets")
        .upsert(
          {
            semana_inicio: input.semana_inicio,
            meta_reunioes: input.meta_reunioes_realizadas,
            meta_fechamentos: input.meta_fechamentos_qtd,
            meta_valor: input.meta_fechamentos_valor || 0,
            user_id: user.id,
          },
          { onConflict: "semana_inicio", ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-targets-list"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-target"] });
      toast.success("Meta semanal salva com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar meta semanal"),
  });
}

interface CreateMonthlyTargetInput {
  mes_ano: string;
  meta_faturamento: number;
}

export function useCreateMonthlyTarget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMonthlyTargetInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("crm_monthly_targets")
        .upsert(
          {
            mes: input.mes_ano,
            meta_valor: input.meta_faturamento,
            user_id: user.id,
          },
          { onConflict: "mes", ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-targets-list"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-target"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-targets-with-progress"] });
      toast.success("Meta mensal salva com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar meta mensal"),
  });
}

export interface WeeklyTargetWithProgress extends WeeklyTarget {
  resultado: { fechamentos: number; valorFechado: number; reunioesRealizadas: number };
  progresso: { contratos: number; reunioes: number };
  isPast: boolean;
}

export interface MonthlyTargetWithProgress extends MonthlyTarget {
  resultado: { valorFechado: number; qtdFechamentos: number };
  progresso: number;
  isPast: boolean;
}

export function useWeeklyTargetsWithProgress(year?: number, month?: number) {
  const now = new Date();
  const selectedYear = year || now.getFullYear();
  const selectedMonth = month || (now.getMonth() + 1);

  return useQuery({
    queryKey: ["weekly-targets-with-progress", selectedYear, selectedMonth],
    queryFn: async () => {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = endOfMonth(startDate);
      const startOfPeriod = format(startDate, "yyyy-MM-dd");
      const endOfPeriod = format(endDate, "yyyy-MM-dd");

      const { data: targets, error } = await supabase
        .from("crm_weekly_targets")
        .select("*")
        .gte("semana_inicio", startOfPeriod)
        .lte("semana_inicio", endOfPeriod)
        .order("semana_inicio", { ascending: false });

      if (error) throw error;
      if (!targets) return [];

      const targetsWithProgress = await Promise.all(
        targets.map(async (target) => {
          const { data: fechamentos } = await supabase
            .from("crm_meetings")
            .select("id, valor_fechamento")
            .eq("status", "fechado")
            .gte("data_fechamento", target.semana_inicio + "T00:00:00");

          const { data: realizadas } = await supabase
            .from("crm_meetings")
            .select("id")
            .in("status", ["reuniao_realizada", "proposta_enviada", "fechado", "perdido"])
            .gte("data_reuniao", target.semana_inicio + "T00:00:00");

          const fechamentosCount = fechamentos?.length || 0;
          const realizadasCount = realizadas?.length || 0;

          return {
            id: target.id,
            semana_inicio: target.semana_inicio,
            semana_fim: target.semana_inicio,
            meta_reunioes_realizadas: target.meta_reunioes || 0,
            meta_fechamentos_qtd: target.meta_fechamentos || 0,
            meta_fechamentos_valor: target.meta_valor,
            criado_por: target.user_id || "",
            criado_em: target.created_at,
            resultado: {
              fechamentos: fechamentosCount,
              valorFechado: fechamentos?.reduce((s, m) => s + (m.valor_fechamento || 0), 0) || 0,
              reunioesRealizadas: realizadasCount,
            },
            progresso: {
              contratos: (target.meta_fechamentos || 0) > 0 ? (fechamentosCount / (target.meta_fechamentos || 1)) * 100 : 0,
              reunioes: (target.meta_reunioes || 0) > 0 ? (realizadasCount / (target.meta_reunioes || 1)) * 100 : 0,
            },
            isPast: new Date(target.semana_inicio + "T23:59:59") < new Date(),
          } as WeeklyTargetWithProgress;
        })
      );

      return targetsWithProgress;
    },
  });
}

export function useMonthlyTargetsWithProgress(year?: number) {
  const selectedYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ["monthly-targets-with-progress", selectedYear],
    queryFn: async () => {
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;

      const { data: targets, error } = await supabase
        .from("crm_monthly_targets")
        .select("*")
        .gte("mes", startOfYear)
        .lte("mes", endOfYear)
        .order("mes", { ascending: false });

      if (error) throw error;
      if (!targets) return [];

      const targetsWithProgress = await Promise.all(
        targets.map(async (target) => {
          const fimMes = endOfMonth(new Date(target.mes + "T00:00:00"));

          const { data: fechamentos } = await supabase
            .from("crm_meetings")
            .select("valor_fechamento")
            .eq("status", "fechado")
            .gte("data_fechamento", target.mes + "T00:00:00")
            .lte("data_fechamento", fimMes.toISOString());

          const valorFechado = fechamentos?.reduce((sum, m) => sum + (m.valor_fechamento || 0), 0) || 0;

          return {
            id: target.id,
            mes_ano: target.mes,
            meta_faturamento: target.meta_valor || 0,
            criado_por: target.user_id || "",
            criado_em: target.created_at,
            resultado: { valorFechado, qtdFechamentos: fechamentos?.length || 0 },
            progresso: (target.meta_valor || 0) > 0 ? (valorFechado / (target.meta_valor || 1)) * 100 : 0,
            isPast: fimMes < new Date(),
          } as MonthlyTargetWithProgress;
        })
      );

      return targetsWithProgress;
    },
  });
}

export function useYearlyTargetByYear(ano: number) {
  return useQuery({
    queryKey: ["yearly-target", ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_yearly_targets")
        .select("*")
        .eq("ano", ano)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        ano: data.ano,
        meta_faturamento: data.meta_valor || 0,
        criado_por: data.user_id || "",
        criado_em: data.created_at,
      } as YearlyTarget;
    },
  });
}

interface CreateYearlyTargetInput {
  ano: number;
  meta_faturamento: number;
}

export function useCreateYearlyTarget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateYearlyTargetInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("crm_yearly_targets")
        .upsert(
          {
            ano: input.ano,
            meta_valor: input.meta_faturamento,
            user_id: user.id,
          },
          { onConflict: "ano", ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["yearly-target", variables.ano] });
      toast.success("Meta anual salva com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar meta anual"),
  });
}
