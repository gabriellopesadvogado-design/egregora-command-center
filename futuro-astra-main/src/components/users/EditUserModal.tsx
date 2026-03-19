import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUpdateUserRole } from "@/hooks/useUsers";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const editUserSchema = z.object({
  role: z.enum(["sdr", "closer"], {
    required_error: "Selecione uma função",
  }),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  user: Profile | null;
  open: boolean;
  onClose: () => void;
}

export function EditUserModal({ user, open, onClose }: EditUserModalProps) {
  const updateRole = useUpdateUserRole();

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      role: undefined,
    },
  });

  useEffect(() => {
    if (user && (user.role === "sdr" || user.role === "closer")) {
      form.reset({ role: user.role });
    }
  }, [user, form]);

  const onSubmit = async (data: EditUserForm) => {
    if (!user) return;

    try {
      await updateRole.mutateAsync({
        user_id: user.id,
        role: data.role,
      });
      onClose();
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Editando: <strong>{user.nome}</strong>
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sdr">SDR</SelectItem>
                      <SelectItem value="closer">Closer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateRole.isPending}>
                {updateRole.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
