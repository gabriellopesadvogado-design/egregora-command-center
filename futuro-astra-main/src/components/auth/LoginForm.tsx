import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface LoginFormProps {
  onSwitchToSignUp: () => void;
}

export function LoginForm({ onSwitchToSignUp }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error("Erro ao entrar", {
        description: error.message,
      });
    } else {
      toast.success("Bem-vindo de volta!");
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold tracking-tight">Entrar</CardTitle>
        <CardDescription className="text-muted-foreground">
          Acesse sua conta para continuar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Não tem uma conta? </span>
          <button
            onClick={onSwitchToSignUp}
            className="font-medium text-primary hover:underline"
          >
            Criar conta
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
