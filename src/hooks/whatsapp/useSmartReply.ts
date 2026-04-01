import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSmartReply(conversationId: string | null) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase.functions.invoke('suggest-smart-replies', {
        body: { conversation_id: conversationId },
      });
      setSuggestions(data?.suggestions || []);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  return { suggestions, isLoading, fetchSuggestions };
}
