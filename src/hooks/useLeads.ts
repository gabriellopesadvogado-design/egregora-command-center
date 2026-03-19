import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export type LeadInsert = TablesInsert<"crm_leads">;

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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-page"] });
      queryClient.invalidateQueries({ queryKey: ["leads-no-meeting-count"] });
    },
  });
}

export function useCreateMeetingFromLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meeting: TablesInsert<"crm_meetings">) => {
      const { data, error } = await supabase
        .from("crm_meetings")
        .insert(meeting)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-page"] });
      queryClient.invalidateQueries({ queryKey: ["leads-no-meeting-count"] });
    },
  });
}
