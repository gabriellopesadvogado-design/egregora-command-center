import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, XCircle } from "lucide-react";
import type { Meeting } from "@/hooks/useMeetings";

interface CanceledMeetingsTableProps {
  meetings: Meeting[];
  isLoading: boolean;
  onReschedule: (meeting: Meeting) => void;
  onMarkLost: (meeting: Meeting) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  cancelada: { label: "Cancelada", className: "bg-destructive/10 text-destructive border-destructive/20" },
  no_show: { label: "No Show", className: "bg-warning/10 text-warning border-warning/20" },
};

const fonteConfig: Record<string, { label: string; className: string }> = {
  google: { label: "Google", className: "bg-info/10 text-info" },
  meta: { label: "Meta", className: "bg-primary/10 text-primary" },
  blog: { label: "Blog", className: "bg-accent/10 text-accent" },
  organico: { label: "Orgânico", className: "bg-success/10 text-success" },
  indicacao: { label: "Indicação", className: "bg-warning/10 text-warning" },
  reativacao: { label: "Reativação", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200" },
  outros: { label: "Outros", className: "bg-muted text-muted-foreground" },
};

export function CanceledMeetingsTable({
  meetings,
  isLoading,
  onReschedule,
  onMarkLost,
}: CanceledMeetingsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Nenhuma reunião cancelada ou no show</p>
        <p className="text-sm">Todas as reuniões estão em dia!</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data Original</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Fonte</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Closer</TableHead>
            <TableHead>SDR</TableHead>
            <TableHead>Observação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meetings.map((meeting) => {
            const statusInfo = statusConfig[meeting.status] || statusConfig.cancelada;
            const fonte = meeting.leads?.origem || "outros";
            const fonteInfo = fonteConfig[fonte] || fonteConfig.outros;

            return (
              <TableRow key={meeting.id}>
                <TableCell className="font-medium">
                  {meeting.data_reuniao ? format(new Date(meeting.data_reuniao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                </TableCell>
                <TableCell>
                  {meeting.nome_lead || meeting.leads?.nome || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={fonteInfo.className}>
                    {fonteInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusInfo.className}>
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>{meeting.closer?.nome || "—"}</TableCell>
                <TableCell>{meeting.sdr?.nome || "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {meeting.notas || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReschedule(meeting)}
                    >
                      <CalendarClock className="h-4 w-4 mr-1" />
                      Reagendar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onMarkLost(meeting)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Perder
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
