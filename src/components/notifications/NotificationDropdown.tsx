import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  onClose: () => void;
}

const tipoIcons: Record<string, string> = {
  lembrete_sdr: "📅",
  lembrete_closer_5min: "⏰",
  lembrete_closer_agora: "🔔",
};

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const recentNotifications = notifications?.slice(0, 5) || [];
  const hasUnread = recentNotifications.some((n) => !n.lida);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead.mutateAsync(id);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <h4 className="font-semibold">Notificações</h4>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => markAllAsRead.mutate()}
          >
            <Check className="mr-1 h-3 w-3" />
            Marcar todas
          </Button>
        )}
      </div>
      <Separator />
      
      <ScrollArea className="max-h-[300px]">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 opacity-50" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentNotifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => {
                  if (!notification.lida) {
                    handleMarkAsRead(notification.id);
                  }
                }}
                className={cn(
                  "w-full text-left p-4 transition-colors hover:bg-muted/50",
                  !notification.lida && "bg-primary/5"
                )}
              >
                <div className="flex gap-3">
                  <span className="text-lg">
                    {tipoIcons[notification.tipo] || "🔔"}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm", !notification.lida && "font-medium")}>
                        {notification.titulo}
                      </p>
                      {!notification.lida && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {notification.mensagem && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.mensagem}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.enviado_em), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <Separator />
      <div className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-center text-sm"
          asChild
          onClick={onClose}
        >
          <Link to="/notificacoes">
            Ver todas
            <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
