import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSummary(conversationId: string | null) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['conversation_summary', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      // TODO: Buscar resumo da conversa
      return null;
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
  });

  return {
    summary,
    isLoading,
    isGenerating: generateMutation.isPending,
    generate: generateMutation.mutate,
  };
}
