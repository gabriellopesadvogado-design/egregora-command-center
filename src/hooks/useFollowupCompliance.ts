import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ComplianceRow {
  closer_id: string;
  closer_nome: string;
  due_total: number;
  done_total: number;
  overdue_total: number;
  compliance: number | null;
}

interface Params {
  startDate: Date;
  endDate: Date;
  includeIgnored: boolean;
}

export function useFollowupCompliance({ startDate, endDate, includeIgnored }: Params) {
  return useQuery({
    queryKey: ["followup-compliance", startDate.toISOString(), endDate.toISOString(), includeIgnored],
    queryFn: async () => {
      // The RPC function may not exist in the new schema, return empty
      try {
        const { data, error } = await (supabase as any).rpc("followup_compliance_by_closer", {
          p_start: startDate.toISOString().split("T")[0],
          p_end: endDate.toISOString().split("T")[0],
          p_include_ignored: includeIgnored,
        });
        if (error) return [];
        return (data || []) as ComplianceRow[];
      } catch {
        return [];
      }
    },
  });
}
