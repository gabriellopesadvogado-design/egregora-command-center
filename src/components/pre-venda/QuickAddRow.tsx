import { useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { validatePhone, PHONE_ERROR_MESSAGE } from "@/utils/normalizePhone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useClosers } from "@/hooks/useClosers";
import { useCreateMeeting } from "@/hooks/useMeetings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuickAddRow() {
  const [horario, setHorario] = useState("09:00");
  const [nomeLead, setNomeLead] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneError, setTelefoneError] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [closerId, setCloserId] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: closers = [] } = useClosers();
  const createMeeting = useCreateMeeting();

  const resetForm = () => {
    setHorario("09:00");
    setNomeLead("");
    setTelefone("");
    setTelefoneError("");
    setData(new Date());
    setCloserId("");
  };

  const handleSubmit = async () => {
    if (!nomeLead.trim()) { toast.error("Digite o nome do lead"); return; }
    if (!closerId) { toast.error("Selecione um closer"); return; }

    let normalized = "";
    if (telefone.trim()) {
      const { valid, normalized: n } = validatePhone(telefone);
      if (!valid) { setTelefoneError(PHONE_ERROR_MESSAGE); toast.error("Telefone inválido"); return; }
      normalized = n;
    }
    setTelefoneError("");

    const [hours, minutes] = horario.split(":").map(Number);
    const dataReuniao = new Date(data);
    dataReuniao.setHours(hours, minutes, 0, 0);

    try {
      await createMeeting.mutateAsync({
        nome_lead: nomeLead.trim(),
        data_reuniao: dataReuniao.toISOString(),
        status: "reuniao_agendada",
        closer_id: closerId,
        telefone_lead: normalized || null,
      } as any);
      toast.success("Reunião agendada!");
      resetForm();
    } catch {
      toast.error("Erro ao agendar reunião");
    }
  };

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/50">
      {/* Horário */}
      <TableCell className="py-2">
        <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} className="h-8 w-20 text-sm" />
      </TableCell>
      {/* Lead */}
      <TableCell className="py-2">
        <Input placeholder="Nome do lead..." value={nomeLead} onChange={e => setNomeLead(e.target.value)} className="h-8 text-sm" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
      </TableCell>
      {/* Telefone */}
      <TableCell className="py-2">
        <Input type="tel" placeholder="+55 11 99999-9999" value={telefone} onChange={e => { setTelefone(e.target.value); if (telefoneError) setTelefoneError(""); }} className={cn("h-8 text-sm", telefoneError && "border-destructive")} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
      </TableCell>
      {/* Data */}
      <TableCell className="py-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start">
              {format(data, "dd/MM/yy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={data} onSelect={d => { if (d) setData(d); setCalendarOpen(false); }} locale={ptBR} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </TableCell>
      {/* Fonte - empty placeholder */}
      <TableCell className="py-2">
        <span className="text-xs text-muted-foreground">—</span>
      </TableCell>
      {/* Status - fixed */}
      <TableCell className="py-2">
        <span className="text-xs text-muted-foreground">Agendada</span>
      </TableCell>
      {/* Closer */}
      <TableCell className="py-2">
        <Select value={closerId} onValueChange={setCloserId}>
          <SelectTrigger className={cn("h-8 text-xs w-full", !closerId && "text-muted-foreground")}>
            <SelectValue placeholder="Closer" />
          </SelectTrigger>
          <SelectContent>
            {closers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      {/* SDR - auto */}
      <TableCell className="py-2">
        <span className="text-xs text-muted-foreground">Auto</span>
      </TableCell>
      {/* Ações */}
      <TableCell className="py-2">
        <Button size="sm" className="h-8 w-8 p-0" onClick={handleSubmit} disabled={createMeeting.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
