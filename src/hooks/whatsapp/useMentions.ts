import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InternalMention {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export function useMentions(conversationId: string | null) {
  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ['mentions', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return [] as InternalMention[];
    },
    enabled: !!conversationId,
  });

  return { mentions, isLoading };
}

export function useConversationMentions(conversationId: string | null) {
  return useMentions(conversationId);
}

export function useCreateMention() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      // TODO: Criar menção
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions'] });
    },
  });
}
