import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAllProfiles } from "@/hooks/useUsers";
import type { Meeting } from "@/hooks/useMeetings";
import { toast } from "sonner";

interface AgendarReuniaoModalProps {
  open: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onConfirm: (data: {
    data_reuniao: string;
    closer_id: string;
    sdr_id?: string;
    tipo_servico?: string;
    observacao?: string;
  }) => void;
  isLoading?: boolean;
}

export function AgendarReuniaoModal({ open, meeting, onClose, onConfirm, isLoading }: AgendarReuniaoModalProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("10:00");
  const [closerId, setCloserId] = useState("");
  const [sdrId, setSdrId] = useState("");
  const [tipoServico, setTipoServico] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: users = [] } = useAllProfiles();
  const closers = users.filter(u => ["closer", "admin"].includes(u.cargo) && u.ativo);
  const sdrs = users.filter(u => u.cargo === "sdr" && u.ativo);

  useEffect(() => {
    if (open && meeting) {
      setDate(meeting.data_reuniao ? new Date(meeting.data_reuniao) : new Date());
      setTime(meeting.data_reuniao ? format(new Date(meeting.data_reuniao), "HH:mm") : "10:00");
      setCloserId(meeting.closer_id || "");
      setSdrId(meeting.sdr_id || "");
      setTipoServico(meeting.tipo_servico || "");
      setObservacao("");
    }
  }, [open, meeting]);

  const handleConfirm = () => {
    if (!closerId) {
      toast.error("Selecione o Closer responsável");
      return;
    }
    const [h, m] = time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);

    onConfirm({
      data_reuniao: dt.toISOString(),
      closer_id: closerId,
      sdr_id: sdrId || undefined,
      tipo_servico: tipoServico || undefined,
      observacao: observacao || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🗓️ Agendar Reunião</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {meeting && (
            <p className="text-sm text-muted-foreground">Lead: <strong>{meeting.nome_lead}</strong></p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={d => d && setDate(d)}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Closer responsável *</Label>
            <Select value={closerId} onValueChange={setCloserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {closers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>SDR responsável</Label>
            <Select value={sdrId || "none"} onValueChange={v => setSdrId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {sdrs.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de serviço</Label>
            <Select value={tipoServico || "none"} onValueChange={v => setTipoServico(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não definido</SelectItem>
                <SelectItem value="nacionalidade_portuguesa">Nacionalidade Portuguesa</SelectItem>
                <SelectItem value="residencia_brasileira">Residência Brasileira</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder="Observação sobre o agendamento..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Agendar Reunião"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
