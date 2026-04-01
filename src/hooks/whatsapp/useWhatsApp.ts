import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook para mensagens
export function useWhatsAppMessages(conversationId: string | null) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['whatsapp_messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

  return { messages, isLoading };
}

// Hook para envio
export function useWhatsAppSend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, type = 'text' }: {
      conversationId: string;
      content: string;
      type?: string;
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_send_queue')
        .insert({
          conversation_id: conversationId,
          content,
          message_type: type,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', variables.conversationId] });
    },
  });
}

// Hook para análise de sentimento
export function useWhatsAppSentiment(conversationId: string | null) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sentiment, setSentiment] = useState<any>(null);

  const analyze = useCallback(async () => {
    if (!conversationId) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-whatsapp-sentiment', {
        body: { conversation_id: conversationId },
      });
      if (error) throw error;
      setSentiment(data);
    } finally {
      setIsAnalyzing(false);
    }
  }, [conversationId]);

  return { sentiment, isAnalyzing, analyze };
}

// Hook para conversas
export function useWhatsAppConversations() {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['whatsapp_conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:whatsapp_contacts(*),
          last_message:whatsapp_messages(content, sent_at)
        `)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return { conversations, isLoading };
}

// Hook para contato
export function useWhatsAppContact(contactId: string | null) {
  const { data: contact, isLoading } = useQuery({
    queryKey: ['whatsapp_contact', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });

  return { contact, isLoading };
}

// Hook para instâncias
export function useWhatsAppInstances() {
  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['whatsapp_instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  return { instances, isLoading };
}
