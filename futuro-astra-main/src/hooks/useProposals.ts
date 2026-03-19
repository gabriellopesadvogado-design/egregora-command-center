import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate, Database } from "@/integrations/supabase/types";

export type Proposal = Tables<"proposals"> & {
  leads?: Tables<"leads">;
  closer?: Tables<"profiles">;
};

export type ProposalInsert = TablesInsert<"proposals">;
export type ProposalUpdate = TablesUpdate<"proposals">;
export type ProposalStatus = Database["public"]["Enums"]["proposal_status"];

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
        .from("proposals")
        .select(`
          *,
          leads:lead_id (*),
          closer:profiles!proposals_closer_id_fkey (*)
        `)
        .order("criado_em", { ascending: false });

      if (filters?.closerId) {
        query = query.eq("closer_id", filters.closerId);
      }
      if (filters?.startDate) {
        query = query.gte("criado_em", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("criado_em", filters.endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let proposals = (data || []) as unknown as Proposal[];

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
        .from("proposals")
        .insert(proposal)
        .select(`
          *,
          leads:lead_id (*),
          closer:profiles!proposals_closer_id_fkey (*)
        `)
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
        .from("proposals")
        .update(update)
        .eq("id", id)
        .select(`
          *,
          leads:lead_id (*),
          closer:profiles!proposals_closer_id_fkey (*)
        `)
        .single();

      if (error) throw error;
      return data as unknown as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}
