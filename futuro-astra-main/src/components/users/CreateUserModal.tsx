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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateUser } from "@/hooks/useUsers";
import { Eye, EyeOff } from "lucide-react";

const ALLOWED_DOMAIN = "@egregoramigration.com.br";

const createUserSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .refine(
      (email) => email.toLowerCase().endsWith(ALLOWED_DOMAIN),
      `Apenas emails do domínio ${ALLOWED_DOMAIN} são permitidos`
    ),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .max(72, "Senha muito longa"),
  role: z.enum(["sdr", "closer"], {
    required_error: "Selecione uma função",
  }),
});

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

interface CreateUserFormData {
  nome: string;
  email: string;
  password: string;
  role: "sdr" | "closer";
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const createUser = useCreateUser();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nome: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await createUser.mutateAsync(data);
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
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={`usuario${ALLOWED_DOMAIN}`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
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

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
