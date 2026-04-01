import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePendingTransfers(conversationId: string | null) {
  const queryClient = useQueryClient();

  const { data: pendingTransfer, isLoading } = useQuery({
    queryKey: ['pending_transfer', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      return null;
    },
    enabled: !!conversationId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_transfer', conversationId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_transfer', conversationId] });
    },
  });

  return {
    pendingTransfer,
    isLoading,
    accept: acceptMutation.mutate,
    reject: rejectMutation.mutate,
    isAccepting: acceptMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
