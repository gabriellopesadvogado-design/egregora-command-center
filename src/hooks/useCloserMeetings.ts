import { useAuth } from "@/hooks/useAuth";
import { useMeetings, type MeetingsFilters } from "@/hooks/useMeetings";

export function useCloserMeetings(
  filters?: Omit<MeetingsFilters, "closerId"> & { closerId?: string; sdrId?: string }
) {
  const { user, role } = useAuth();
  
  // Admin e Manager veem todas as reuniões
  // Closers veem apenas as atribuídas a eles
  const isAdminOrManager = role === "admin" || role === "manager";

  return useMeetings({
    ...filters,
    // Se filtro de closer especificado, usa ele
    // Se admin/manager sem filtro, mostra todos
    // Se não, filtra pelo usuário atual
    closerId: filters?.closerId 
      ? filters.closerId 
      : (isAdminOrManager ? undefined : user?.id),
    sdrId: filters?.sdrId,
  });
}
