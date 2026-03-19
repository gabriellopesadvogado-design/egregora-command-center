import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import type { LeadWithMeeting, PlataformaOrigem, MeetingStatus, AvaliacaoReuniao } from "@/hooks/useLeadsWithMeetings";

const fonteLabels: Record<PlataformaOrigem, string> = {
  google: "Google",
  meta: "Meta",
  blog: "Blog",
  organico: "Orgânico",
  indicacao: "Indicação",
  reativacao: "Reativação",
  outros: "Outro",
};

const statusLabels: Record<MeetingStatus, string> = {
  agendada: "Agendada",
  aconteceu: "Realizada",
  proposta_enviada: "Proposta Enviada",
  ganha: "Ganha",
  perdida: "Perdida",
  no_show: "No Show",
  cancelada: "Cancelada",
};

const qualificacaoLabels: Record<AvaliacaoReuniao, string> = {
  boa: "Muito Bom",
  neutra: "Bom",
  ruim: "Ruim",
};

function escapeCsvField(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface ExportLeadsCsvButtonProps {
  leads: LeadWithMeeting[];
}

export function ExportLeadsCsvButton({ leads }: ExportLeadsCsvButtonProps) {
  const handleExport = () => {
    if (leads.length === 0) return;

    const headers = [
      "Nome",
      "Telefone",
      "Origem",
      "Status",
      "Responsável",
      "Tipo Responsável",
      "Qualificação",
      "Data Última Reunião",
      "Observação",
      "ID Reunião",
    ];

    const rows = leads.map((lead) => [
      escapeCsvField(lead.nome),
      escapeCsvField(lead.telefone || ""),
      escapeCsvField(lead.fonte ? fonteLabels[lead.fonte] || lead.fonte : ""),
      escapeCsvField(statusLabels[lead.status] || lead.status),
      escapeCsvField(lead.responsavel),
      escapeCsvField(lead.responsavelTipo === "closer" ? "Closer" : "SDR"),
      escapeCsvField(lead.qualificacao ? qualificacaoLabels[lead.qualificacao] || lead.qualificacao : ""),
      escapeCsvField(lead.dataUltimaReuniao ? format(new Date(lead.dataUltimaReuniao), "dd/MM/yyyy") : ""),
      escapeCsvField(lead.observacao || ""),
      escapeCsvField(lead.meetingId),
    ]);

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    // BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`${leads.length} lead${leads.length !== 1 ? "s" : ""} exportado${leads.length !== 1 ? "s" : ""} com sucesso`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 gap-1"
      onClick={handleExport}
      disabled={leads.length === 0}
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </Button>
  );
}
