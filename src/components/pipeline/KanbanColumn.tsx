import { cn } from "@/lib/utils";
import { DealCard } from "./DealCard";
import type { Meeting, CrmStatus } from "@/hooks/useMeetings";

interface KanbanColumnProps {
  status: CrmStatus;
  title: string;
  colorClass: string;
  meetings: Meeting[];
  followupTodayIds: Set<string>;
  onCardClick: (meeting: Meeting) => void;
  onDrop: (meetingId: string, newStatus: CrmStatus) => void;
}

export function KanbanColumn({
  status,
  title,
  colorClass,
  meetings,
  followupTodayIds,
  onCardClick,
  onDrop,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-muted/50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-muted/50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-muted/50");
    const meetingId = e.dataTransfer.getData("meetingId");
    if (meetingId) onDrop(meetingId, status);
  };

  const handleDragStart = (e: React.DragEvent, meetingId: string) => {
    e.dataTransfer.setData("meetingId", meetingId);
  };

  const total = meetings.reduce((sum, m) => sum + (m.valor_proposta || 0), 0);

  return (
    <div
      className={cn(
        "flex flex-col bg-muted/30 rounded-lg border-t-4 min-h-[400px] min-w-[220px] transition-colors",
        colorClass
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs bg-muted rounded-full px-2 py-0.5 font-medium">{meetings.length}</span>
        </div>
        {total > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
          </p>
        )}
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {meetings.map((m) => (
          <div key={m.id} draggable onDragStart={(e) => handleDragStart(e, m.id)}>
            <DealCard
              meeting={m}
              hasFollowupToday={followupTodayIds.has(m.id)}
              onClick={() => onCardClick(m)}
            />
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum deal</div>
        )}
      </div>
    </div>
  );
}
