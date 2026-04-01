import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMessageEdit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      // TODO: Implementar edição de mensagem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages'] });
    },
  });
}
