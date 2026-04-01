import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCategorizeConversation(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
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
}
