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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useClosers } from "@/hooks/useClosers";
import { useCreateMeeting } from "@/hooks/useMeetings";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuickAddRow() {
  const [horario, setHorario] = useState("09:00");
  const [nomeLead, setNomeLead] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneError, setTelefoneError] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [fonte, setFonte] = useState<string>("outros");
  const [status, setStatus] = useState<string>("agendada");
  const [closerId, setCloserId] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: closers = [] } = useClosers();
  const createMeeting = useCreateMeeting();
  
  const { profile } = useAuth();

  const resetForm = () => {
    setHorario("09:00");
    setNomeLead("");
    setTelefone("");
    setTelefoneError("");
    setData(new Date());
    setFonte("outros");
    setStatus("agendada");
    setCloserId("");
    setObservacao("");
  };

  const handleSubmit = async () => {
    if (!nomeLead.trim()) {
      toast.error("Digite o nome do lead");
      return;
    }
    if (!closerId) {
      toast.error("Selecione um closer");
      return;
    }

    const { valid, normalized } = validatePhone(telefone);
    if (!valid) {
      setTelefoneError(PHONE_ERROR_MESSAGE);
      toast.error("Telefone inválido");
      return;
    }
    setTelefoneError("");

    // Parse horario and combine with data
    const [hours, minutes] = horario.split(":").map(Number);
    const inicioEm = new Date(data);
    inicioEm.setHours(hours, minutes, 0, 0);

    try {
      const result = await createMeeting.mutateAsync({
        nome_lead: nomeLead.trim(),
        inicio_em: inicioEm.toISOString(),
        fonte_lead: fonte as any,
        status: status as any,
        closer_id: closerId,
        observacao: observacao.trim() || null,
        telefone: normalized,
      } as any);


      toast.success("Reunião agendada!");
      resetForm();
    } catch (error) {
      toast.error("Erro ao agendar reunião");
    }
  };

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/50">
      <TableCell className="py-2">
        <Input
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          className="h-8 w-20 text-sm"
        />
      </TableCell>
      <TableCell className="py-2">
        <Input
          placeholder="Nome do lead..."
          value={nomeLead}
          onChange={(e) => setNomeLead(e.target.value)}
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </TableCell>
      <TableCell className="py-2">
        <Input
          type="tel"
          placeholder="Ex: +55 11 99999-9999"
          value={telefone}
          onChange={(e) => {
            setTelefone(e.target.value);
            if (telefoneError) setTelefoneError("");
          }}
          className={cn("h-8 text-sm", telefoneError && "border-destructive")}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          title={telefoneError || undefined}
        />
      </TableCell>
      <TableCell className="py-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start">
              {format(data, "dd/MM/yy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data}
              onSelect={(d) => {
                if (d) setData(d);
                setCalendarOpen(false);
              }}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell className="py-2">
        <Select value={fonte} onValueChange={setFonte}>
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="meta">Meta</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
            <SelectItem value="organico">Orgânico</SelectItem>
            <SelectItem value="indicacao">Indicação</SelectItem>
            <SelectItem value="reativacao">Reativação</SelectItem>
            <SelectItem value="outros">Outro</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agendada">🕐 Agendada</SelectItem>
            <SelectItem value="aconteceu">✅ Realizada</SelectItem>
            <SelectItem value="cancelada">🚫 Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Select value={closerId} onValueChange={setCloserId}>
          <SelectTrigger className={cn("h-8 text-xs w-full", !closerId && "text-muted-foreground")}>
            <SelectValue placeholder="Closer" />
          </SelectTrigger>
          <SelectContent>
            {closers.map((closer) => (
              <SelectItem key={closer.id} value={closer.id}>
                {closer.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Input
          placeholder="Obs..."
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </TableCell>
      <TableCell className="py-2">
        <Button 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={handleSubmit}
          disabled={createMeeting.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
