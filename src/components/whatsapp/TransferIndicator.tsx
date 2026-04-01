import { ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InstanceTransfer } from '@/hooks/whatsapp/useInstanceTransfer';

const SECTOR_LABELS: Record<string, string> = {
  comercial: 'Comercial',
  suporte: 'Suporte',
  financeiro: 'Financeiro',
  marketing: 'Marketing',
  operacoes: 'Operações',
  rh: 'RH',
  juridico: 'Jurídico',
  ti: 'TI',
};

interface TransferIndicatorProps {
  transfer: InstanceTransfer;
}

export function TransferIndicator({ transfer }: TransferIndicatorProps) {
  const fromName = transfer.from_instance?.name || 'Instância anterior';
  const toName = transfer.to_instance?.name || 'Nova instância';
  const fromSector = transfer.from_instance?.sector;
  const toSector = transfer.to_instance?.sector;
  const transferredBy = transfer.transferred_by_profile?.full_name;
  const transferDate = format(new Date(transfer.created_at), "dd/MM 'às' HH:mm", {
    locale: ptBR,
  });

  return (
    <div className="flex justify-center my-4">
      <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 max-w-md w-full">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <ArrowRightLeft className="h-4 w-4" />
          <span className="font-medium">Conversa transferida</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <div className="text-center">
            <p className="font-medium">{fromName}</p>
            {fromSector && (
              <p className="text-xs text-muted-foreground">
                {SECTOR_LABELS[fromSector] || fromSector}
              </p>
            )}
          </div>

          <ArrowRightLeft className="h-4 w-4 text-primary flex-shrink-0" />

          <div className="text-center">
            <p className="font-medium text-primary">{toName}</p>
            {toSector && (
              <p className="text-xs text-muted-foreground">
                {SECTOR_LABELS[toSector] || toSector}
              </p>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center mt-2">
          {transferredBy && <span>por {transferredBy} • </span>}
          <span>{transferDate}</span>
        </div>

        {transfer.reason && (
          <p className="text-xs text-muted-foreground text-center mt-1 italic">
            "{transfer.reason}"
          </p>
        )}
      </div>
    </div>
  );
}
