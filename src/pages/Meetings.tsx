import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, CalendarX, Filter, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCanceledMeetings } from "@/hooks/useCanceledMeetings";
import { useRecoveryStats } from "@/hooks/useRecoveryStats";
import { useUpdateMeeting, type Meeting, type PlataformaOrigem } from "@/hooks/useMeetings";

import { useAllProfiles } from "@/hooks/useUsers";
import { CanceledMeetingsTable } from "@/components/meetings/CanceledMeetingsTable";
import { RescheduleModal } from "@/components/meetings/RescheduleModal";
import { RecoveryChart } from "@/components/meetings/RecoveryChart";
import { MotivoPerdaModal } from "@/components/shared/MotivoPerdaModal";
import { SimplePeriodFilter, getDateRangeForPeriod, type PeriodType } from "@/components/pre-venda/SimplePeriodFilter";

const fonteOptions: { value: PlataformaOrigem; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "meta", label: "Meta" },
  { value: "blog", label: "Blog" },
  { value: "organico", label: "Orgânico" },
  { value: "indicacao", label: "Indicação" },
  { value: "reativacao", label: "Reativação" },
  { value: "outros", label: "Outro" },
];

export default function Meetings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);

  // Filtros
  const [period, setPeriod] = useState<PeriodType>("this_month");
  const [selectedFonte, setSelectedFonte] = useState<PlataformaOrigem[]>([]);
  const [selectedCloser, setSelectedCloser] = useState<string | undefined>();
  const [selectedSdr, setSelectedSdr] = useState<string | undefined>();

  const { data: users = [] } = useAllProfiles();
  const sdrs = users.filter((u) => u.cargo === "sdr" && u.ativo);
  const closers = users.filter((u) => ["closer", "admin", "gestor"].includes(u.cargo) && u.ativo);

  const dateRange = getDateRangeForPeriod(period);

  const filters = {
    ...dateRange,
    closerId: selectedCloser,
    sdrId: selectedSdr,
    plataforma: selectedFonte.length > 0 ? selectedFonte : undefined,
  };

  const { data: meetings = [], isLoading: meetingsLoading } = useCanceledMeetings(filters);
  const { data: stats, isLoading: statsLoading } = useRecoveryStats(filters);
  const updateMeeting = useUpdateMeeting();
  

  // Filter by search term
  const filteredMeetings = meetings.filter((m) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.nome_lead?.toLowerCase().includes(term) ||
      m.leads?.nome?.toLowerCase().includes(term) ||
      m.closer?.nome?.toLowerCase().includes(term) ||
      m.sdr?.nome?.toLowerCase().includes(term)
    );
  });

  const toggleFonte = (fonte: PlataformaOrigem) => {
    setSelectedFonte((prev) =>
      prev.includes(fonte)
        ? prev.filter((f) => f !== fonte)
        : [...prev, fonte]
    );
  };

  const clearFilters = () => {
    setSelectedFonte([]);
    setSelectedCloser(undefined);
    setSelectedSdr(undefined);
  };

  const activeFiltersCount =
    selectedFonte.length +
    (selectedCloser ? 1 : 0) +
    (selectedSdr ? 1 : 0);
  const hasFilters = activeFiltersCount > 0;

  const handleReschedule = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setRescheduleModalOpen(true);
  };

  const handleMarkLost = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setLossModalOpen(true);
  };

  const confirmReschedule = async (novaData: Date) => {
    if (!selectedMeeting) return;

    try {
      await updateMeeting.mutateAsync({
        id: selectedMeeting.id,
        status: "reuniao_agendada",
        data_reuniao: novaData.toISOString(),
      });


      toast.success("Reunião reagendada com sucesso!");
      setRescheduleModalOpen(false);
      setSelectedMeeting(null);
    } catch (error) {
      toast.error("Erro ao reagendar reunião");
    }
  };

  const confirmLoss = async (motivo: string, _observacao: string) => {
    if (!selectedMeeting) return;

    try {
      await updateMeeting.mutateAsync({
        id: selectedMeeting.id,
        status: "perdido",
        motivo_perda: motivo,
        data_fechamento: new Date().toISOString(),
      });

      toast.success("Reunião marcada como perdida");
      setLossModalOpen(false);
      setSelectedMeeting(null);
    } catch (error) {
      toast.error("Erro ao atualizar reunião");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarX className="h-6 w-6 text-warning" />
            Recuperação de Reuniões
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie reuniões canceladas ou no show
            {!meetingsLoading && ` • ${filteredMeetings.length} reuniões`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-[200px]"
            />
          </div>

          <SimplePeriodFilter value={period} onChange={setPeriod} />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                {/* Header com botão limpar */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtros</h4>
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-auto px-2 py-1 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* SDR - Select */}
                <div className="space-y-2">
                  <Label className="text-sm">SDR</Label>
                  <Select
                    value={selectedSdr || "all"}
                    onValueChange={(v) => setSelectedSdr(v === "all" ? undefined : v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {sdrs.map((sdr) => (
                        <SelectItem key={sdr.id} value={sdr.id}>
                          {sdr.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Closer - Select */}
                <div className="space-y-2">
                  <Label className="text-sm">Closer</Label>
                  <Select
                    value={selectedCloser || "all"}
                    onValueChange={(v) => setSelectedCloser(v === "all" ? undefined : v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {closers.map((closer) => (
                        <SelectItem key={closer.id} value={closer.id}>
                          {closer.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origem - Checkboxes em grid */}
                <div className="space-y-2">
                  <Label className="text-sm">Origem</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {fonteOptions.map((option) => (
                      <div key={option.value} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`fonte-${option.value}`}
                          checked={selectedFonte.includes(option.value)}
                          onCheckedChange={() => toggleFonte(option.value)}
                        />
                        <label
                          htmlFor={`fonte-${option.value}`}
                          className="text-xs cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats Row - 4 cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <RecoveryChart
          total={stats?.totalCanceladasNoShow || 0}
          recuperadas={stats?.recuperadas || 0}
          percentual={stats?.percentual || 0}
          isLoading={statsLoading}
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Taxa de No Show
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {stats?.taxaNoShow || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalNoShow || 0} de {stats?.totalReunioes || 0} reuniões totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Pendentes de Ação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredMeetings.length}</div>
            <p className="text-xs text-muted-foreground">
              reuniões aguardando reagendamento ou encerramento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Recuperadas (Total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {stats?.recuperadas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              leads que voltaram após cancelamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <CanceledMeetingsTable
        meetings={filteredMeetings}
        isLoading={meetingsLoading}
        onReschedule={handleReschedule}
        onMarkLost={handleMarkLost}
      />

      {/* Modals */}
      <RescheduleModal
        open={rescheduleModalOpen}
        meeting={selectedMeeting}
        onClose={() => {
          setRescheduleModalOpen(false);
          setSelectedMeeting(null);
        }}
        onConfirm={confirmReschedule}
        isLoading={updateMeeting.isPending}
      />

      <LossModal
        open={lossModalOpen}
        onClose={() => {
          setLossModalOpen(false);
          setSelectedMeeting(null);
        }}
        onConfirm={confirmLoss}
        isLoading={updateMeeting.isPending}
      />
    </div>
  );
}
