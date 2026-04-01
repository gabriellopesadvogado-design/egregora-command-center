import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MessageReaction {
  id: string;
  messageId: string;
  emoji: string;
  userId: string;
}

export function useMessageReactions(messageId: string | null) {
  const queryClient = useQueryClient();

  const { data: reactions = [], isLoading } = useQuery({
    queryKey: ['message_reactions', messageId],
    queryFn: async () => {
      if (!messageId) return [];
      return [];
    },
    enabled: !!messageId,
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ emoji }: { emoji: string }) => {
      if (!messageId) return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_reactions', messageId] });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async (reactionId: string) => {
      // TODO: Remover reação
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message_reactions', messageId] });
    },
  });

  return {
    reactions,
    isLoading,
    addReaction: addReactionMutation.mutate,
    removeReaction: removeReactionMutation.mutate,
  };
}
