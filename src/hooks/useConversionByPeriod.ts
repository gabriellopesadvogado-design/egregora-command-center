import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PeriodBucket {
  label: string;
  ganhas: number;
  perdidas: number;
  abertas: number;
  total: number;
  resolvidas: number;
  taxa: number;
}

export function useConversionByPeriod() {
  return useQuery({
    queryKey: ["conversion-by-period"],
    queryFn: async () => {
      const now = new Date();
      const fourMonthsAgo = startOfMonth(subMonths(now, 3));

      const { data, error } = await supabase
        .from("crm_meetings")
        .select("status, data_reuniao, data_fechamento")
        .in("status", ["proposta_enviada", "fechado", "perdido"])
        .gte("data_reuniao", fourMonthsAgo.toISOString())
        .order("data_reuniao", { ascending: false });

      if (error) throw error;

      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const buckets = new Map<string, PeriodBucket>();

      buckets.set("week", { label: "Esta Semana", ganhas: 0, perdidas: 0, abertas: 0, total: 0, resolvidas: 0, taxa: 0 });

      for (let i = 0; i < 4; i++) {
        const d = subMonths(now, i);
        const key = format(d, "yyyy-MM");
        const label = format(d, "MMM yyyy", { locale: ptBR });
        buckets.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), ganhas: 0, perdidas: 0, abertas: 0, total: 0, resolvidas: 0, taxa: 0 });
      }

      for (const m of data || []) {
        const date = new Date(m.data_reuniao);
        const monthKey = format(date, "yyyy-MM");
        const isThisWeek = date >= weekStart;

        if (isThisWeek) {
          const wb = buckets.get("week")!;
          wb.total++;
          if (m.status === "fechado") { wb.ganhas++; wb.resolvidas++; }
          else if (m.status === "perdido") { wb.perdidas++; wb.resolvidas++; }
          else { wb.abertas++; }
        }

        const mb = buckets.get(monthKey);
        if (mb) {
          mb.total++;
          if (m.status === "fechado") { mb.ganhas++; mb.resolvidas++; }
          else if (m.status === "perdido") { mb.perdidas++; mb.resolvidas++; }
          else { mb.abertas++; }
        }
      }

      for (const b of buckets.values()) {
        b.taxa = b.total > 0 ? (b.ganhas / b.total) * 100 : 0;
      }

      const result: PeriodBucket[] = [buckets.get("week")!];
      for (let i = 0; i < 4; i++) {
        const key = format(subMonths(now, i), "yyyy-MM");
        result.push(buckets.get(key)!);
      }

      return result;
    },
  });
}
