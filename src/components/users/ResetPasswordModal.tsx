import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useResetUserPassword } from "@/hooks/useUsers";
import { Eye, EyeOff } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"core_users">;

const resetPasswordSchema = z.object({
  new_password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .max(72, "Senha muito longa"),
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordModalProps {
  user: Profile | null;
  open: boolean;
  onClose: () => void;
}

export function ResetPasswordModal({ user, open, onClose }: ResetPasswordModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const resetPassword = useResetUserPassword();

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      new_password: "",
    },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!user) return;

    try {
      await resetPassword.mutateAsync({
        user_id: user.id,
        new_password: data.new_password,
      });
      form.reset();
      onClose();
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Redefinir Senha</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Redefinindo senha de: <strong>{user.nome}</strong>
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
