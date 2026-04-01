import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useClaudeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content }]);

    try {
      const { data, error } = await supabase.functions.invoke('claude-chat', {
        body: { message: content, context: messages },
      });

      if (error) throw error;

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response || 'Sem resposta' },
      ]);
    } catch (err) {
      console.error('Erro no chat:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Erro ao processar mensagem.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
