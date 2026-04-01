import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSmartReplies(conversationId: string | null) {
  const mutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase.functions.invoke('suggest-smart-replies', {
        body: { conversation_id: conversationId },
      });
      if (error) throw error;
      return data?.suggestions || [];
    },
  });

  return {
    suggestions: mutation.data || [],
    isLoading: mutation.isPending,
    fetchSuggestions: mutation.mutate,
  };
}
