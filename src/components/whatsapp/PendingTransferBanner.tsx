import { ArrowRightLeft, Clock, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePendingTransferForConversation, useAcceptTransfer, PendingTransfer } from "@/hooks/whatsapp/usePendingTransfers";

interface PendingTransferBannerProps {
  conversationId: string;
}

export const PendingTransferBanner = ({ conversationId }: PendingTransferBannerProps) => {
  const { data: pendingTransfer, isLoading } = usePendingTransferForConversation(conversationId);
  const acceptMutation = useAcceptTransfer();

  if (isLoading || !pendingTransfer) {
    return null;
  }

  const handleAccept = () => {
    acceptMutation.mutate({
      transferId: pendingTransfer.id,
      conversationId
    });
  };

  const timeAgo = formatDistanceToNow(new Date(pendingTransfer.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <Alert className="mx-4 mt-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <ArrowRightLeft className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
        Conversa Transferida
        <span className="text-xs font-normal text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </span>
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              De: {pendingTransfer.from_instance?.name || 'Setor desconhecido'}
              {pendingTransfer.from_instance?.sector && ` (${pendingTransfer.from_instance.sector})`}
            </span>
            {pendingTransfer.transferred_by_profile && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <User className="h-3 w-3" />
                por {pendingTransfer.transferred_by_profile.full_name}
              </span>
            )}
          </div>
          
          {pendingTransfer.reason && (
            <p className="text-sm italic">
              "{pendingTransfer.reason}"
            </p>
          )}
          
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
            className="w-fit mt-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aceitando...
              </>
            ) : (
              'Aceitar e Assumir'
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
