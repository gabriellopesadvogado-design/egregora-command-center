import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMessageEditHistory(messageId: string | null) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['message_edit_history', messageId],
    queryFn: async () => {
      if (!messageId) return [];
      return [];
    },
    enabled: !!messageId,
  });

  return { history, isLoading };
}
