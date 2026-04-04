import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Bot, User, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  instanceId?: string | null;
}

export function ConversationList({ selectedId, onSelect, instanceId }: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "nina" | "human" | "paused">("all");

  // Buscar conversas reais do Supabase
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['whatsapp_conversations_list', instanceId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          id,
          status,
          is_active,
          last_message_at,
          instance_id,
          contact:whatsapp_contacts (
            id,
            name,
            phone_number,
            profile_picture_url
          )
        `)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      // Buscar última mensagem de cada conversa
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from('whatsapp_messages')
            .select('content, sent_at')
            .eq('conversation_id', conv.id)
            .order('sent_at', { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('message_from', 'user');

          return {
            ...conv,
            lastMessage: messages?.[0]?.content || 'Sem mensagens',
            lastMessageAt: conv.last_message_at,
            unreadCount: 0, // TODO: implementar contador de não lidas
          };
        })
      );

      return conversationsWithMessages;
    },
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  const filteredConversations = conversations.filter((conv: any) => {
    const contact = conv.contact;
    const matchesSearch =
      (contact?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact?.phone_number || '').includes(searchTerm);
    const matchesFilter = filter === "all" || conv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "nina":
        return <Bot className="h-3 w-3 text-blue-500" />;
      case "human":
        return <User className="h-3 w-3 text-green-500" />;
      case "paused":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return <Bot className="h-3 w-3 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "nina":
        return "IA";
      case "human":
        return "Humano";
      case "paused":
        return "Pausado";
      default:
        return "IA";
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: false, 
        locale: ptBR 
      });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Filter buttons */}
        <div className="flex gap-1 mt-3">
          {(["all", "nina", "human", "paused"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs"
            >
              {f === "all" ? "Todas" : getStatusLabel(f)}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conv: any) => {
              const contact = conv.contact;
              const contactName = contact?.name || contact?.phone_number || 'Desconhecido';
              const initials = contactName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                    selectedId === conv.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact?.profile_picture_url} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{contactName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {getStatusIcon(conv.status)}
                        <span className="ml-1">{getStatusLabel(conv.status)}</span>
                      </Badge>
                    </div>
                  </div>

                  {conv.unreadCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
