import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
