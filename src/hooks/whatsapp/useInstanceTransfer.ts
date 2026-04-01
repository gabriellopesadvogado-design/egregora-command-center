import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InstanceTransfer {
  id: string;
  conversationId: string;
  fromInstanceId: string;
  toInstanceId: string;
  status: 'pending' | 'completed' | 'rejected';
}

export function useInstanceTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, instanceId }: { conversationId: string; instanceId: string }) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ instance_id: instanceId })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations'] });
    },
  });
}
