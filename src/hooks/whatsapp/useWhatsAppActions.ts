import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Hook com conversationId (para ações de conversa)
export function useWhatsAppActions(conversationId?: string | null) {
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

  // Atualizar contato
  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, data }: { contactId: string; data: { name?: string; notes?: string | null } }) => {
      console.log('[updateContact] Updating contact:', contactId, data);
      const { error } = await supabase
        .from('whatsapp_contacts')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);
      if (error) throw error;
      console.log('[updateContact] Contact updated successfully');
    },
    onSuccess: () => {
      console.log('[updateContact] Invalidating queries, conversationId:', conversationId);
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations_list'] });
      // Invalidar a query específica da conversa
      if (conversationId) {
        console.log('[updateContact] Invalidating conversation query:', conversationId);
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
        // Forçar refetch imediato
        queryClient.refetchQueries({ queryKey: ['conversation', conversationId] });
      }
      toast.success('Contato atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[updateContact] Error:', error);
      toast.error('Erro ao atualizar contato: ' + error.message);
    },
  });

  return {
    markAsRead: markAsReadMutation.mutate,
    closeConversation: closeConversationMutation.mutate,
    toggleStatus: toggleStatusMutation.mutate,
    updateContact: updateContactMutation.mutate,
    isClosing: closeConversationMutation.isPending,
    isTogglingStatus: toggleStatusMutation.isPending,
    isUpdatingContact: updateContactMutation.isPending,
  };
}
