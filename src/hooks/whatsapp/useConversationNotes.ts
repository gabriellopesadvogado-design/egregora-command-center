import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useConversationNotes(conversationId: string | null) {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['conversation_notes', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      // TODO: Buscar notas da conversa
      return [];
    },
    enabled: !!conversationId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) return;
      // TODO: Adicionar nota
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation_notes', conversationId] });
    },
  });

  return {
    notes,
    isLoading,
    addNote: addNoteMutation.mutate,
    isAdding: addNoteMutation.isPending,
  };
}
