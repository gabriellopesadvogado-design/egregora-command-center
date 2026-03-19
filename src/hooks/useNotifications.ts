import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type Notification = Tables<"core_notifications">;
export type NotificationTipo = string;

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("core_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
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
          table: "core_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          if (newNotification.tipo === "lembrete_closer_5min") {
            setUrgentAlert(newNotification);
          } else {
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

          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const dismissUrgentAlert = useCallback(() => setUrgentAlert(null), []);

  return { urgentAlert, dismissUrgentAlert };
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("core_notifications")
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
        .from("core_notifications")
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
