import { useState } from 'react';
import { MoreVertical, Edit, Archive, Download, CheckCircle, RotateCcw, ArrowRightLeft, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EditContactModal } from './EditContactModal';
import { TransferInstanceModal } from './TransferInstanceModal';
import { useWhatsAppActions } from '@/hooks/whatsapp/useWhatsAppActions';
import { exportConversation } from '@/utils/exportConversation';
import { toast } from 'sonner';

interface ChatHeaderMenuProps {
  conversation: any;
  onRefresh?: () => void;
}

export function ChatHeaderMenu({ conversation, onRefresh }: ChatHeaderMenuProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [generateSummary, setGenerateSummary] = useState(true);
  const [qualidadeLead, setQualidadeLead] = useState<string | null>(
    conversation.contact?.qualidade_lead || null
  );

  const handleQualidade = async (qualidade: 'ruim' | 'bom' | 'muito_bom') => {
    setQualidadeLead(qualidade);
    await supabase
      .from('whatsapp_contacts')
      .update({ qualidade_lead: qualidade })
      .eq('id', conversation.contact.id);
    toast.success(`Lead classificado como ${qualidade === 'muito_bom' ? 'Muito Bom' : qualidade === 'bom' ? 'Bom' : 'Ruim'}`);
    onRefresh?.();
  };

  const { 
    archiveConversation, 
    closeConversation, 
    reopenConversation, 
    isArchiving, 
    isClosing, 
    isReopening 
  } = useWhatsAppActions();

  const handleArchive = () => {
    archiveConversation(conversation.id, {
      onSuccess: () => onRefresh?.(),
    });
  };

  const handleClose = () => {
    closeConversation(
      { conversationId: conversation.id, generateSummary },
      {
        onSuccess: () => {
          setShowCloseDialog(false);
          onRefresh?.();
        },
      }
    );
  };

  const handleReopen = () => {
    reopenConversation(conversation.id, {
      onSuccess: () => onRefresh?.(),
    });
  };

  const handleExport = async () => {
    try {
      await exportConversation(conversation.id);
      toast.success('Conversa exportada com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar conversa');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-background z-50">
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar contato
          </DropdownMenuItem>

          {conversation.status === 'closed' ? (
            <DropdownMenuItem onClick={handleReopen} disabled={isReopening}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reabrir conversa
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowCloseDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Encerrar conversa
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => setIsTransferModalOpen(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transferir para outro setor
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
            <Archive className="mr-2 h-4 w-4" />
            Arquivar conversa
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Qualidade do Lead */}
          <DropdownMenuItem className="font-medium text-xs text-muted-foreground" disabled>
            <Star className="mr-2 h-3 w-3" />
            Qualidade do Lead
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleQualidade('muito_bom')}
            className={qualidadeLead === 'muito_bom' ? 'bg-green-500/10 text-green-500' : ''}
          >
            🟢 Muito Bom
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleQualidade('bom')}
            className={qualidadeLead === 'bom' ? 'bg-amber-500/10 text-amber-500' : ''}
          >
            🟡 Bom
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleQualidade('ruim')}
            className={qualidadeLead === 'ruim' ? 'bg-red-500/10 text-red-500' : ''}
          >
            🔴 Ruim
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar conversa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditContactModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        contactId={conversation.contact.id}
        contactName={conversation.contact.name || ''}
        contactPhone={conversation.contact.phone_number}
        contactNotes={conversation.contact.notes}
        onSuccess={onRefresh}
      />

      <TransferInstanceModal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        conversationId={conversation.id}
        currentInstanceId={conversation.instance_id}
        onSuccess={onRefresh}
      />

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa será marcada como concluída e você poderá visualizá-la 
              nos filtros de conversas encerradas.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox 
              id="summary" 
              checked={generateSummary}
              onCheckedChange={(checked) => setGenerateSummary(checked as boolean)}
            />
            <label 
              htmlFor="summary" 
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Gerar resumo automático com IA (recomendado)
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isClosing}>
              {isClosing ? 'Encerrando...' : 'Encerrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
