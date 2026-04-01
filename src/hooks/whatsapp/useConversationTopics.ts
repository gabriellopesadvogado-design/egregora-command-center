import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useConversationTopics(conversationId: string | null) {
  const queryClient = useQueryClient();

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['conversation_topics', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      // TODO: Implementar busca de tópicos
      return [];
    },
    enabled: !!conversationId,
  });

  const categorizeMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
      const { data, error } = await supabase.functions.invoke('categorize-whatsapp-conversation', {
        body: { conversation_id: conversationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation_topics', conversationId] });
    },
  });

  return {
    topics,
    isLoading,
    isCategorizing: categorizeMutation.isPending,
    categorize: categorizeMutation.mutate,
  };
}
