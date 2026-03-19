import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Check, CheckCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, type NotificationTipo } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const tipoLabels: Record<NotificationTipo, { label: string; icon: string }> = {
  lembrete_sdr: { label: "Lembrete SDR", icon: "📅" },
  lembrete_closer_5min: { label: "Lembrete 5min", icon: "⏰" },
  lembrete_closer_agora: { label: "Lembrete Agora", icon: "🔔" },
};

export default function Notificacoes() {
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterLida, setFilterLida] = useState<string>("all");

  const { data: notifications, isLoading, unreadCount } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const filteredNotifications = notifications?.filter((n) => {
    if (filterTipo !== "all" && n.tipo !== filterTipo) return false;
    if (filterLida === "unread" && n.lida) return false;
    if (filterLida === "read" && !n.lida) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Todas lidas"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(tipoLabels).map(([value, { label, icon }]) => (
                <SelectItem key={value} value={value}>
                  {icon} {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={filterLida} onValueChange={setFilterLida}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <SelectItem value="read">Lidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>
            Suas notificações dos últimos 30 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : !filteredNotifications?.length ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 opacity-30" />
              <div>
                <p className="font-medium">Nenhuma notificação</p>
                <p className="text-sm">Você está em dia!</p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-4 py-4 transition-colors",
                    !notification.lida && "bg-primary/5 -mx-6 px-6"
                  )}
                >
                  <span className="text-2xl">
                    {tipoLabels[notification.tipo]?.icon || "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={cn("font-medium", !notification.lida && "text-primary")}>
                          {notification.titulo}
                        </p>
                        {notification.mensagem && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.mensagem}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {" · "}
                          {formatDistanceToNow(new Date(notification.enviado_em), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      {!notification.lida && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead.mutate(notification.id)}
                          disabled={markAsRead.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
