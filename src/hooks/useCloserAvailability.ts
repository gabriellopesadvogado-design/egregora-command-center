import { useQuery } from "@tanstack/react-query";
import { startOfDay, endOfDay, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useClosers } from "./useClosers";

export interface CloserSlot {
  horario: string;
  leadName: string;
  status: string;
  inicioEm: string;
}

export interface CloserAvailability {
  closerId: string;
  nome: string;
  slots: CloserSlot[];
}

export function useCloserAvailability(date: Date) {
  const { data: closers = [] } = useClosers();

  return useQuery({
    queryKey: ["closer-availability", date.toDateString()],
    queryFn: async () => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const { data: meetings, error } = await supabase
        .from("crm_meetings")
        .select("closer_id, data_reuniao, nome_lead, status")
        .gte("data_reuniao", dayStart.toISOString())
        .lte("data_reuniao", dayEnd.toISOString())
        .order("data_reuniao", { ascending: true });

      if (error) throw error;

      const availabilityMap = new Map<string, CloserSlot[]>();
      for (const meeting of meetings || []) {
        if (!meeting.closer_id) continue;
        if (!availabilityMap.has(meeting.closer_id)) {
          availabilityMap.set(meeting.closer_id, []);
        }
        availabilityMap.get(meeting.closer_id)!.push({
          horario: format(new Date(meeting.data_reuniao!), "HH:mm"),
          leadName: meeting.nome_lead || "Lead",
          status: meeting.status || "",
          inicioEm: meeting.data_reuniao || "",
        });
      }

      return closers.map((closer) => ({
        closerId: closer.id,
        nome: closer.nome,
        slots: availabilityMap.get(closer.id) || [],
      }));
    },
    enabled: closers.length > 0,
  });
}
