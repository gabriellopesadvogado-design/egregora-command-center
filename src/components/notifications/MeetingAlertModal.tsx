import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Notification } from "@/hooks/useNotifications";

interface MeetingAlertModalProps {
  notification: Notification | null;
  onDismiss: () => void;
}

export function MeetingAlertModal({ notification, onDismiss }: MeetingAlertModalProps) {
  if (!notification) return null;

  return (
    <AlertDialog open={!!notification} onOpenChange={(open) => !open && onDismiss()}>
      <AlertDialogContent className="max-w-md border-amber-500 border-2">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping bg-amber-400/30 rounded-full" />
            <div className="relative bg-amber-100 dark:bg-amber-900/50 p-4 rounded-full">
              <AlertTriangle className="h-16 w-16 text-amber-500" />
            </div>
          </div>
          
          <AlertDialogTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            Reunião em 5 minutos!
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-base text-foreground">
            {notification.mensagem || "Sua próxima reunião começa em 5 minutos. Prepare-se!"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-4">
          <AlertDialogAction
            onClick={onDismiss}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3"
          >
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
