import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  content: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'cancelled';
}

export function useScheduledMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const { data: scheduledMessages = [], isLoading } = useQuery({
    queryKey: ['scheduled_messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return [] as ScheduledMessage[];
    },
    enabled: !!conversationId,
  });

  return {
    scheduledMessages,
    isLoading,
  };
}

export function useCancelScheduledMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      // TODO: Cancelar mensagem agendada
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_messages'] });
    },
  });
}
