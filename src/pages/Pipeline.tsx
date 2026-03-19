import { useState, useMemo } from "react";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { KanbanFilters, type KanbanFiltersState } from "@/components/pipeline/KanbanFilters";
import { useMeetings } from "@/hooks/useMeetings";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

export default function Pipeline() {
  const { user, role } = useAuth();
  const [filters, setFilters] = useState<KanbanFiltersState>({});

  // Auto-filter by role
  const meetingsFilters = useMemo(() => {
    const f: any = {};
    if (role === "closer") {
      f.closerId = filters.responsavelId || user?.id;
    } else if (role === "sdr") {
      f.sdrId = filters.responsavelId || user?.id;
    } else if (filters.responsavelId) {
      // admin/gestor filtering by a specific user — check both closer and sdr
      f.closerId = filters.responsavelId;
    }
    if (filters.searchTerm) f.searchTerm = filters.searchTerm;
    return f;
  }, [filters, role, user?.id]);

  const { data: meetings = [], isLoading } = useMeetings(meetingsFilters);

  // Exclude nao_elegivel from kanban
  const kanbanMeetings = useMemo(
    () => meetings.filter((m) => m.status !== "nao_elegivel"),
    [meetings]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">Kanban visual do funil comercial</p>
      </div>

      <KanbanFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[400px] min-w-[220px] flex-1" />
          ))}
        </div>
      ) : (
        <KanbanBoard meetings={kanbanMeetings} />
      )}
    </div>
  );
}
