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
      const { error } = await supabase
        .from('whatsapp_contacts')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations_list'] });
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      }
      toast.success('Contato atualizado com sucesso!');
    },
    onError: (error: Error) => {
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
