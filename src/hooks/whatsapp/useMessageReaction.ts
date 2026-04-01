import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMessageReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      // TODO: Implementar reação
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages'] });
    },
  });
}
