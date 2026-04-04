import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ContactPipeline {
  contact_id: string;
  contact_name: string;
  phone_number: string;
  lead_id: string | null;
  lead_name: string | null;
  lead_email: string | null;
  campanha: string | null;
  utm_source: string | null;
  meeting_id: string | null;
  pipeline_status: string | null;
  lead_quality: string | null;
  closer_id: string | null;
  sdr_id: string | null;
  valor_proposta: number | null;
  valor_fechamento: number | null;
  data_reuniao: string | null;
  data_proposta: string | null;
  pipeline_order: number;
}

export function useContactPipeline(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-pipeline", contactId],
    queryFn: async (): Promise<ContactPipeline | null> => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from("whatsapp_contact_pipeline")
        .select("*")
        .eq("contact_id", contactId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching contact pipeline:", error);
        return null;
      }

      return data as ContactPipeline | null;
    },
    enabled: !!contactId,
    staleTime: 30000, // 30 segundos
  });
}

export function useContactsPipeline(contactIds: string[]) {
  return useQuery({
    queryKey: ["contacts-pipeline", contactIds.sort().join(",")],
    queryFn: async (): Promise<Record<string, ContactPipeline>> => {
      if (!contactIds.length) return {};

      const { data, error } = await supabase
        .from("whatsapp_contact_pipeline")
        .select("*")
        .in("contact_id", contactIds);

      if (error) {
        console.error("Error fetching contacts pipeline:", error);
        return {};
      }

      const map: Record<string, ContactPipeline> = {};
      (data || []).forEach((item: ContactPipeline) => {
        map[item.contact_id] = item;
      });

      return map;
    },
    enabled: contactIds.length > 0,
    staleTime: 30000,
  });
}
