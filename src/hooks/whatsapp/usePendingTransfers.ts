import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PendingTransfer {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  fromInstanceId?: string;
  toInstanceId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export function usePendingTransfers(conversationId: string | null) {
  const queryClient = useQueryClient();

  const { data: pendingTransfer, isLoading } = useQuery({
    queryKey: ['pending_transfer', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      return null as PendingTransfer | null;
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

// Alias para compatibilidade
export function usePendingTransferForConversation(conversationId: string | null) {
  return usePendingTransfers(conversationId);
}

export function useAcceptTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transferId: string) => {
      // TODO: Implementar aceite de transferência
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_transfer'] });
    },
  });
}

export function useRejectTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transferId: string) => {
      // TODO: Implementar rejeição de transferência
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_transfer'] });
    },
  });
}
