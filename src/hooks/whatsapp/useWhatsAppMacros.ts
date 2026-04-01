import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWhatsAppMacros() {
  const { data: macros = [], isLoading } = useQuery({
    queryKey: ['whatsapp_macros'],
    queryFn: async () => {
      // TODO: Buscar macros do banco
      return [];
    },
  });

  return { macros, isLoading };
}
