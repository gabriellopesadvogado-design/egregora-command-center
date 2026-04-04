import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendMessageParams {
  conversationId: string;
  content?: string;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  mediaBase64?: string;
  mediaMimetype?: string;
  fileName?: string;
  quotedMessageId?: string;
}

/**
 * Hook para enviar mensagens via WhatsApp
 * Automaticamente detecta o provider (Z-API ou Evolution) e usa a edge function correta
 */
export function useWhatsAppSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      const { conversationId, ...messageParams } = params;

      // 1. Buscar a conversa para saber a instância e o provider
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select(`
          instance_id,
          whatsapp_instances (
            id,
            provider
          )
        `)
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        throw new Error('Conversa não encontrada');
      }

      const provider = (conversation.whatsapp_instances as any)?.provider || 'zapi';

      // 2. Chamar a edge function correta baseado no provider
      // Meta e Z-API usam a mesma função que detecta o provider internamente
      const functionName = 'send-zapi-message';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          conversationId,
          ...messageParams,
        },
      });

      if (error) {
        console.error(`[useWhatsAppSendMessage] Error calling ${functionName}:`, error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao enviar mensagem');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
    },
    onError: (error: Error) => {
      console.error('[useWhatsAppSendMessage] Error:', error);
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });
}
