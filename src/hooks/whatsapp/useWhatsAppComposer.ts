import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useWhatsAppComposer() {
  const [composedMessage, setComposedMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const compose = useCallback(async (prompt: string, context?: any) => {
    setIsComposing(true);
    try {
      const { data } = await supabase.functions.invoke('compose-whatsapp-message', {
        body: { prompt, context },
      });
      setComposedMessage(data?.message || '');
    } finally {
      setIsComposing(false);
    }
  }, []);

  return { composedMessage, isComposing, compose };
}
