import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAIComposer() {
  const mutation = useMutation({
    mutationFn: async ({ prompt, context }: { prompt: string; context?: any }) => {
      const { data, error } = await supabase.functions.invoke('compose-whatsapp-message', {
        body: { prompt, context },
      });
      if (error) throw error;
      return data?.message || '';
    },
  });

  return {
    composedMessage: mutation.data || '',
    isComposing: mutation.isPending,
    compose: mutation.mutate,
  };
}
