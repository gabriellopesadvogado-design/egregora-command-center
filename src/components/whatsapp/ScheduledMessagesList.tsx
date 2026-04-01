import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useScheduledMessages, useCancelScheduledMessage } from "@/hooks/whatsapp/useScheduledMessages";

interface ScheduledMessagesListProps {
  conversationId: string | null;
}

export const ScheduledMessagesList = ({ conversationId }: ScheduledMessagesListProps) => {
  const { data: scheduledMessages, isLoading } = useScheduledMessages(conversationId);
  const cancelMutation = useCancelScheduledMessage();

  const pendingMessages = scheduledMessages?.filter(m => m.status === 'pending') || [];

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (pendingMessages.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma mensagem agendada</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-sm">Mensagens Agendadas</h3>
        <Badge variant="secondary" className="ml-auto">
          {pendingMessages.length}
        </Badge>
      </div>
      
      <ScrollArea className="max-h-48">
        <div className="space-y-2">
          {pendingMessages.map((msg) => (
            <div
              key={msg.id}
              className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2">
                    {msg.content || `[${msg.message_type}]`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(msg.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta mensagem não será enviada. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Manter</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelMutation.mutate(msg.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancelar envio
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
