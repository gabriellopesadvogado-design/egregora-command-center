import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationTipo = Database["public"]["Enums"]["notification_tipo"];

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("enviado_em", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  const unreadCount = query.data?.filter((n) => !n.lida).length || 0;

  return {
    ...query,
    unreadCount,
  };
}

// Separate hook for urgent alerts - should only be used once in AppLayout
export function useUrgentNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [urgentAlert, setUrgentAlert] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`urgent-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // For 5-minute closer alerts, show the big modal instead of toast
          if (newNotification.tipo === "lembrete_closer_5min") {
            setUrgentAlert(newNotification);
          } else {
            // Show toast for other notification types
            toast(newNotification.titulo, {
              description: newNotification.mensagem || undefined,
              duration: 8000,
              action: {
                label: "Ver",
                onClick: () => {
                  window.location.href = "/notificacoes";
                },
              },
            });
          }

          // Invalidate query to refetch
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const dismissUrgentAlert = useCallback(() => setUrgentAlert(null), []);

  return {
    urgentAlert,
    dismissUrgentAlert,
  };
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ lida: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("notifications")
        .update({ lida: true })
        .eq("user_id", user.id)
        .eq("lida", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      toast.success("Todas as notificações marcadas como lidas");
    },
  });
}
