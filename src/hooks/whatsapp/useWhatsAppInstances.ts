import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Ordem de exibição das instâncias
const INSTANCE_ORDER: Record<string, number> = {
  'Egrégora - API Oficial': 1,
  'SDR Hugo': 2,
  'SDR Júnior': 3,
  'Closer Victor Lira': 4,
  'Closer Larissa': 5,
};

function sortInstances(instances: any[]): any[] {
  return [...instances].sort((a, b) => {
    const orderA = INSTANCE_ORDER[a.nome] ?? 99;
    const orderB = INSTANCE_ORDER[b.nome] ?? 99;
    return orderA - orderB;
  });
}

export function useWhatsAppInstances() {
  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['whatsapp_instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return sortInstances(data || []);
    },
  });

  return { instances, isLoading };
}
