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
        .from("weekly_targets")
        .select("*, profiles:criado_por(nome)")
        .order("semana_inicio", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as WeeklyTarget[];
    },
  });
}

export function useMonthlyTargets() {
  return useQuery({
    queryKey: ["monthly-targets-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_targets")
        .select("*, profiles:criado_por(nome)")
        .order("mes_ano", { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as MonthlyTarget[];
    },
  });
}

export function useWeeklyTargetByWeek(semanaInicio: string, semanaFim: string) {
  return useQuery({
    queryKey: ["weekly-target", semanaInicio, semanaFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_targets")
        .select("*")
        .eq("semana_inicio", semanaInicio)
        .eq("semana_fim", semanaFim)
        .maybeSingle();

      if (error) throw error;
      return data as WeeklyTarget | null;
    },
  });
}

export function useMonthlyTargetByMonth(mesAno: string) {
  return useQuery({
    queryKey: ["monthly-target", mesAno],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_targets")
        .select("*")
        .eq("mes_ano", mesAno)
        .maybeSingle();

      if (error) throw error;
      return data as MonthlyTarget | null;
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
        .from("weekly_targets")
        .upsert(
          {
            ...input,
            criado_por: user.id,
          },
          {
            onConflict: "semana_inicio,semana_fim",
            ignoreDuplicates: false,
          }
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
    onError: (error) => {
      console.error("Error saving weekly target:", error);
      toast.error("Erro ao salvar meta semanal");
    },
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
        .from("monthly_targets")
        .upsert(
          {
            ...input,
            criado_por: user.id,
          },
          {
            onConflict: "mes_ano",
            ignoreDuplicates: false,
          }
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
    onError: (error) => {
      console.error("Error saving monthly target:", error);
      toast.error("Erro ao salvar meta mensal");
    },
  });
}

// Interfaces for progress-enhanced targets
export interface WeeklyTargetWithProgress extends WeeklyTarget {
  resultado: {
    fechamentos: number;
    valorFechado: number;
    reunioesRealizadas: number;
  };
  progresso: {
    contratos: number;
    reunioes: number;
  };
  isPast: boolean;
}

export interface MonthlyTargetWithProgress extends MonthlyTarget {
  resultado: {
    valorFechado: number;
    qtdFechamentos: number;
  };
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
      // Calcular primeiro e último dia do mês
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = endOfMonth(startDate);

      const startOfPeriod = format(startDate, "yyyy-MM-dd");
      const endOfPeriod = format(endDate, "yyyy-MM-dd");

      const { data: targets, error } = await supabase
        .from("weekly_targets")
        .select("*, profiles:criado_por(nome)")
        .gte("semana_inicio", startOfPeriod)
        .lte("semana_inicio", endOfPeriod)
        .order("semana_inicio", { ascending: false });

      if (error) throw error;
      if (!targets) return [];

      const targetsWithProgress = await Promise.all(
        targets.map(async (target) => {
          // Buscar fechamentos (ganhas) do período
          const { data: fechamentos } = await supabase
            .from("meetings")
            .select("id, valor_fechado")
            .eq("status", "ganha")
            .gte("fechado_em", target.semana_inicio + "T00:00:00")
            .lte("fechado_em", target.semana_fim + "T23:59:59");

          // Buscar reuniões realizadas do período
          const { data: realizadas } = await supabase
            .from("meetings")
            .select("id")
            .in("status", ["aconteceu", "proposta_enviada", "ganha", "perdida"])
            .gte("inicio_em", target.semana_inicio + "T00:00:00")
            .lte("inicio_em", target.semana_fim + "T23:59:59");

          const fechamentosCount = fechamentos?.length || 0;
          const realizadasCount = realizadas?.length || 0;

          return {
            ...target,
            resultado: {
              fechamentos: fechamentosCount,
              valorFechado: fechamentos?.reduce((s, m) => s + (m.valor_fechado || 0), 0) || 0,
              reunioesRealizadas: realizadasCount,
            },
            progresso: {
              contratos: target.meta_fechamentos_qtd > 0
                ? (fechamentosCount / target.meta_fechamentos_qtd) * 100
                : 0,
              reunioes: (target.meta_reunioes_realizadas || 0) > 0
                ? (realizadasCount / (target.meta_reunioes_realizadas || 1)) * 100
                : 0,
            },
            isPast: new Date(target.semana_fim + "T23:59:59") < new Date(),
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
        .from("monthly_targets")
        .select("*, profiles:criado_por(nome)")
        .gte("mes_ano", startOfYear)
        .lte("mes_ano", endOfYear)
        .order("mes_ano", { ascending: false });

      if (error) throw error;
      if (!targets) return [];

      const targetsWithProgress = await Promise.all(
        targets.map(async (target) => {
          const inicioMes = target.mes_ano;
          const fimMes = endOfMonth(new Date(target.mes_ano + "T00:00:00"));

          const { data: fechamentos } = await supabase
            .from("meetings")
            .select("valor_fechado")
            .eq("status", "ganha")
            .gte("fechado_em", inicioMes + "T00:00:00")
            .lte("fechado_em", fimMes.toISOString());

          const valorFechado = fechamentos?.reduce(
            (sum, m) => sum + (m.valor_fechado || 0), 0
          ) || 0;

          return {
            ...target,
            resultado: {
              valorFechado,
              qtdFechamentos: fechamentos?.length || 0,
            },
            progresso: target.meta_faturamento > 0
              ? (valorFechado / target.meta_faturamento) * 100
              : 0,
            isPast: fimMes < new Date(),
          } as MonthlyTargetWithProgress;
        })
      );

      return targetsWithProgress;
    },
  });
}

// ==================== YEARLY TARGETS ====================

export function useYearlyTargetByYear(ano: number) {
  return useQuery({
    queryKey: ["yearly-target", ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yearly_targets")
        .select("*")
        .eq("ano", ano)
        .maybeSingle();

      if (error) throw error;
      return data as YearlyTarget | null;
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
        .from("yearly_targets")
        .upsert(
          {
            ...input,
            criado_por: user.id,
          },
          {
            onConflict: "ano",
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["yearly-target", variables.ano] });
      queryClient.invalidateQueries({ queryKey: ["yearly-target"] });
      toast.success("Meta anual salva com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving yearly target:", error);
      toast.error("Erro ao salvar meta anual");
    },
  });
}
