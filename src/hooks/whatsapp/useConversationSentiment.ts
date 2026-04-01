import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useConversationSentiment(conversationId: string | null) {
  const queryClient = useQueryClient();

  const { data: sentiment, isLoading } = useQuery({
    queryKey: ['conversation_sentiment', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      return null;
    },
    enabled: !!conversationId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
      const { data, error } = await supabase.functions.invoke('analyze-whatsapp-sentiment', {
        body: { conversation_id: conversationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation_sentiment', conversationId] });
    },
  });

  return {
    sentiment,
    isLoading,
    analyze: analyzeMutation.mutate,
    isAnalyzing: analyzeMutation.isPending,
  };
}
