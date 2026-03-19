import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Lead = Tables<"crm_leads">;
export type LeadInsert = TablesInsert<"crm_leads">;

export function useLeads(searchTerm?: string) {
  return useQuery({
    queryKey: ["leads", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("crm_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("nome", `%${searchTerm}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: Partial<LeadInsert>) => {
      const { data, error } = await supabase
        .from("crm_leads")
        .insert(lead as LeadInsert)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
