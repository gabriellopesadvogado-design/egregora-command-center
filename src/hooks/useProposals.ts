import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Proposal = Tables<"crm_proposals"> & {
  leads?: Tables<"crm_leads"> | null;
  criado_em?: string;
};

export type ProposalInsert = TablesInsert<"crm_proposals">;
export type ProposalUpdate = TablesUpdate<"crm_proposals">;
export type ProposalStatus = string;

export interface ProposalsFilters {
  closerId?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

export function useProposals(filters?: ProposalsFilters) {
  return useQuery({
    queryKey: ["proposals", filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_proposals")
        .select(`
          *,
          leads:lead_id (*)
        `)
        .order("created_at", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let proposals = ((data || []) as any[]).map((p) => ({
        ...p,
        criado_em: p.created_at,
      })) as Proposal[];

      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        proposals = proposals.filter((p) =>
          p.leads?.nome?.toLowerCase().includes(term)
        );
      }

      return proposals;
    },
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposal: ProposalInsert) => {
      const { data, error } = await supabase
        .from("crm_proposals")
        .insert(proposal)
        .select(`*, leads:lead_id (*)`)
        .single();

      if (error) throw error;
      return data as unknown as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: ProposalUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_proposals")
        .update(update)
        .eq("id", id)
        .select(`*, leads:lead_id (*)`)
        .single();

      if (error) throw error;
      return data as unknown as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}
