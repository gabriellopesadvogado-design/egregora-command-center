import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWhatsAppActions(conversationId: string | null) {
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
      // TODO: Marcar como lida
    },
  });

  const closeConversationMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ is_active: false })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: 'nina' | 'human' | 'paused') => {
      if (!conversationId) return;
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ status: newStatus })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });

  return {
    markAsRead: markAsReadMutation.mutate,
    closeConversation: closeConversationMutation.mutate,
    toggleStatus: toggleStatusMutation.mutate,
    isClosing: closeConversationMutation.isPending,
    isTogglingStatus: toggleStatusMutation.isPending,
  };
}
