import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { LeadWithStatus } from "@/hooks/useLeadsPage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: LeadWithStatus | null;
}

const statusLabels: Record<string, string> = {
  sem_reuniao: "Sem reunião",
  em_pipeline: "Em pipeline",
  nao_elegivel: "Não elegível",
  fechado: "Fechado",
  perdido: "Perdido",
};

const origemLabels: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  indicacao: "Indicação",
  organico: "Orgânico",
  hubspot_direto: "HubSpot Direto",
  reativacao: "Reativação",
};

const tipoLabels: Record<string, string> = {
  nacionalidade_portuguesa: "Nacionalidade Portuguesa",
  residencia_brasileira: "Residência Brasileira",
  outro: "Outro",
};

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export function LeadDetailsModal({ open, onClose, lead }: Props) {
  const { data: meeting } = useQuery({
    queryKey: ["lead-meeting-detail", lead?.meetingId],
    queryFn: async () => {
      if (!lead?.meetingId) return null;
      const { data } = await supabase
        .from("crm_meetings")
        .select(`*, closer:core_users!crm_meetings_closer_id_fkey(nome), sdr:core_users!crm_meetings_sdr_id_fkey(nome)`)
        .eq("id", lead.meetingId)
        .single();
      return data;
    },
    enabled: !!lead?.meetingId,
  });

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead.nome}</DialogTitle>
          <DialogDescription>
            <Badge variant="outline">{statusLabels[lead.leadStatus] || lead.leadStatus}</Badge>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <h4 className="text-sm font-semibold mb-2">Dados do Lead</h4>
            <div className="rounded-lg border p-3">
              <DetailRow label="Email" value={lead.email} />
              <DetailRow label="Telefone" value={lead.telefone} />
              <DetailRow label="WhatsApp" value={lead.whatsapp} />
              <DetailRow label="Origem" value={lead.origem ? origemLabels[lead.origem] || lead.origem : null} />
              <DetailRow label="Canal" value={lead.canal} />
              <DetailRow label="Tipo de Interesse" value={lead.tipo_interesse ? tipoLabels[lead.tipo_interesse] || lead.tipo_interesse : null} />
              <DetailRow label="Nacionalidade" value={lead.nacionalidade} />
              <DetailRow label="País de Residência" value={lead.pais_residencia} />
              <DetailRow label="Campanha" value={lead.campanha} />
              <DetailRow label="Entrada" value={lead.created_at ? format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: ptBR }) : null} />
              {lead.hubspot_contact_id && <DetailRow label="HubSpot ID" value={lead.hubspot_contact_id} />}
            </div>
          </div>

          {meeting && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Reunião Vinculada</h4>
              <div className="rounded-lg border p-3">
                <DetailRow label="Status" value={meeting.status} />
                <DetailRow label="Closer" value={(meeting.closer as any)?.nome} />
                <DetailRow label="SDR" value={(meeting.sdr as any)?.nome} />
                <DetailRow label="Data da Reunião" value={meeting.data_reuniao ? format(new Date(meeting.data_reuniao), "dd MMM yyyy HH:mm", { locale: ptBR }) : null} />
                <DetailRow label="Notas" value={meeting.notas} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
