import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAgents() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('core_users')
        .select('*')
        .eq('ativo', true);
      if (error) throw error;
      return data || [];
    },
  });

  return { agents, isLoading };
}
