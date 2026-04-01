import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useConversationAssignment(conversationId: string | null) {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      if (!conversationId) return;
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          assigned_to: userId,
          status: userId ? 'human' : 'nina'
        })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ toUserId, toInstanceId }: { toUserId?: string; toInstanceId?: string }) => {
      if (!conversationId) return;
      const updates: any = {};
      if (toUserId) updates.assigned_to = toUserId;
      if (toInstanceId) updates.instance_id = toInstanceId;
      
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations'] });
    },
  });

  return {
    assign: assignMutation.mutate,
    isAssigning: assignMutation.isPending,
    transfer: transferMutation.mutate,
    isTransferring: transferMutation.isPending,
  };
}
