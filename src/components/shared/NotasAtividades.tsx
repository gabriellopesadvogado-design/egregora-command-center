import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { FileText, Phone, Mail, MessageCircle, Calendar, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface NotasAtividadesProps {
  meetingId: string;
}

interface Nota {
  id: string;
  meeting_id: string;
  user_id: string;
  conteudo: string;
  tipo: string;
  sincronizado_hubspot: boolean;
  created_at: string;
  core_users: { nome: string; cargo: string } | null;
}

const tipoConfig: Record<string, { label: string; icon: typeof FileText; className?: string }> = {
  nota: { label: "Nota", icon: FileText },
  ligacao: { label: "Ligação", icon: Phone },
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, className: "text-green-500" },
  reuniao: { label: "Reunião", icon: Calendar },
};

export function NotasAtividades({ meetingId }: NotasAtividadesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState("nota");

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ["crm-notas", meetingId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_notas")
        .select("*, core_users!user_id(nome, cargo)")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Nota[];
    },
    enabled: !!meetingId,
  });

  const insertNota = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await (supabase as any)
        .from("crm_notas")
        .insert({
          meeting_id: meetingId,
          user_id: user.id,
          conteudo,
          tipo,
          sincronizado_hubspot: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setConteudo("");
      setTipo("nota");
      queryClient.invalidateQueries({ queryKey: ["crm-notas", meetingId] });
      toast.success("Nota registrada");
    },
    onError: () => toast.error("Erro ao salvar nota"),
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    }
    return format(date, "dd MMM yyyy, HH:mm", { locale: ptBR });
  };

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground">Notas e Atividades</h4>

      {/* Form */}
      <div className="space-y-2">
        <Textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          rows={3}
          placeholder="Registre uma nota, ligação ou atividade..."
          className="resize-y"
        />
        <div className="flex items-center gap-2">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(tipoConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-1.5">
                    <cfg.icon className={`h-3 w-3 ${cfg.className || ""}`} />
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={!conteudo.trim() || insertNota.isPending}
            onClick={() => insertNota.mutate()}
          >
            <Send className="h-3 w-3 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : notas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma nota registrada</p>
      ) : (
        <div className="space-y-2">
          {notas.map((nota) => {
            const cfg = tipoConfig[nota.tipo] || tipoConfig.nota;
            const Icon = cfg.icon;
            return (
              <div key={nota.id} className="flex gap-2 rounded-md border p-2.5 text-sm">
                <div className="mt-0.5">
                  <Icon className={`h-4 w-4 ${cfg.className || "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="whitespace-pre-wrap break-words">{nota.conteudo}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>
                      {nota.core_users
                        ? `${nota.core_users.nome} (${nota.core_users.cargo})`
                        : "Usuário"}
                    </span>
                    <span>·</span>
                    <span>{formatDate(nota.created_at)}</span>
                    {nota.sincronizado_hubspot && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 text-green-600 border-green-300">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Sincronizado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
