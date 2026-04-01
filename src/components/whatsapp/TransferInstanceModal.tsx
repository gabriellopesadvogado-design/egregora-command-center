import { useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWhatsAppInstances } from '@/hooks/whatsapp/useWhatsAppInstances';
import { useInstanceTransfer } from '@/hooks/whatsapp/useInstanceTransfer';
import { cn } from '@/lib/utils';

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

const SECTOR_COLORS: Record<string, string> = {
  comercial: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  suporte: 'bg-green-500/20 text-green-700 dark:text-green-300',
  financeiro: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  marketing: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  operacoes: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  rh: 'bg-pink-500/20 text-pink-700 dark:text-pink-300',
  juridico: 'bg-red-500/20 text-red-700 dark:text-red-300',
  ti: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
};

interface TransferInstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentInstanceId: string;
  onSuccess?: () => void;
}

export function TransferInstanceModal({
  open,
  onOpenChange,
  conversationId,
  currentInstanceId,
  onSuccess,
}: TransferInstanceModalProps) {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [sendFarewell, setSendFarewell] = useState(true);
  const [farewellMessage, setFarewellMessage] = useState(
    'Você será atendido por nossa equipe especializada em breve. Obrigado!'
  );

  const { instances } = useWhatsAppInstances();
  const { transferConversation, isTransferring } = useInstanceTransfer(conversationId);

  // Filtrar instâncias disponíveis (excluir a atual)
  const availableInstances = instances?.filter(
    (inst) => inst.id !== currentInstanceId && inst.status === 'connected'
  ) || [];

  // Agrupar por setor
  const instancesBySector = availableInstances.reduce((acc, inst) => {
    const sector = inst.sector || 'sem_setor';
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(inst);
    return acc;
  }, {} as Record<string, typeof availableInstances>);

  const handleTransfer = () => {
    if (!selectedInstanceId) return;

    transferConversation(
      {
        conversationId,
        toInstanceId: selectedInstanceId,
        reason: reason || undefined,
        sendFarewellMessage: sendFarewell,
        farewellMessage: sendFarewell ? farewellMessage : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedInstanceId(null);
          setReason('');
          onSuccess?.();
        },
      }
    );
  };

  const selectedInstance = availableInstances.find(i => i.id === selectedInstanceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir para outro setor
          </DialogTitle>
          <DialogDescription>
            Selecione a instância/setor que irá continuar o atendimento. O cliente
            passará a receber mensagens do novo número.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lista de instâncias */}
          <div className="space-y-2">
            <Label>Selecione o destino</Label>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {Object.entries(instancesBySector).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma outra instância conectada disponível
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(instancesBySector).map(([sector, insts]) => (
                    <div key={sector}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            sector !== 'sem_setor' && SECTOR_COLORS[sector]
                          )}
                        >
                          {SECTOR_LABELS[sector] || 'Sem setor'}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-2">
                        {insts.map((inst) => (
                          <button
                            key={inst.id}
                            type="button"
                            onClick={() => setSelectedInstanceId(inst.id)}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                              selectedInstanceId === inst.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            )}
                          >
                            <span className="font-medium">{inst.name}</span>
                            <span className="text-xs opacity-70 ml-2">
                              ({inst.instance_name})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Motivo (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da transferência (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Cliente fechou compra, encaminhar para processos"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Mensagem de despedida */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="farewell"
                checked={sendFarewell}
                onCheckedChange={(checked) => setSendFarewell(checked as boolean)}
              />
              <Label htmlFor="farewell" className="cursor-pointer">
                Enviar mensagem de despedida
              </Label>
            </div>

            {sendFarewell && (
              <Textarea
                placeholder="Mensagem que será enviada ao cliente..."
                value={farewellMessage}
                onChange={(e) => setFarewellMessage(e.target.value)}
                rows={2}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedInstanceId || isTransferring}
          >
            {isTransferring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transferir para {selectedInstance?.name || 'destino'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
