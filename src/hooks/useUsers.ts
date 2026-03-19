import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface CreateUserData {
  email: string;
  password: string;
  nome: string;
  role: "sdr" | "closer";
}

interface UpdateRoleData {
  user_id: string;
  role: "sdr" | "closer";
}

interface ToggleActiveData {
  user_id: string;
  ativo: boolean;
}

interface ResetPasswordData {
  user_id: string;
  new_password: string;
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create_user", ...userData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success("Usuário criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar usuário");
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRoleData) => {
      const { data: result, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "update_role", ...data },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success("Função atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar função");
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ToggleActiveData) => {
      const { data: result, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "toggle_active", ...data },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success(variables.ativo ? "Usuário ativado!" : "Usuário desativado!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao alterar status do usuário");
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const { data: result, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "reset_password", ...data },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao redefinir senha");
    },
  });
}
