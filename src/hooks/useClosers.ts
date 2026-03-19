import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"core_users">;

export function useClosers() {
  return useQuery({
    queryKey: ["closers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_users")
        .select("*")
        .in("cargo", ["closer", "admin", "manager"])
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useAllUsers() {
  return useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_users")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Profile[];
    },
  });
}
