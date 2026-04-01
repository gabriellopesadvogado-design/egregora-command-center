import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useConversationSummaries(conversationId: string | null) {
  const queryClient = useQueryClient();

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ['conversation_summaries', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return [];
    },
    enabled: !!conversationId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
      const { data, error } = await supabase.functions.invoke('generate-conversation-summary', {
        body: { conversation_id: conversationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation_summaries', conversationId] });
    },
  });

  return {
    summaries,
    isLoading,
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
  };
}
