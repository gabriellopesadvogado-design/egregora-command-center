import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useScheduleMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, scheduledAt }: {
      conversationId: string;
      content: string;
      scheduledAt: Date;
    }) => {
      // TODO: Implementar agendamento
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_messages'] });
    },
  });
}
