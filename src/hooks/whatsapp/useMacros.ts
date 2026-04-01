import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMacros() {
  const { data: macros = [], isLoading } = useQuery({
    queryKey: ['whatsapp_macros'],
    queryFn: async () => {
      // TODO: Buscar macros
      return [];
    },
  });

  return { macros, isLoading };
}
