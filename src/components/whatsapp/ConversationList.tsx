import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, Bot, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  contact: {
    name: string;
    phone: string;
    avatar?: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "nina" | "human" | "paused";
  assignedTo?: string;
}

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Mock data - será substituído por dados reais do Supabase
const mockConversations: Conversation[] = [
  {
    id: "1",
    contact: { name: "João Silva", phone: "+55 11 99999-1234" },
    lastMessage: "Olá, gostaria de saber mais sobre naturalização",
    lastMessageAt: "10:30",
    unreadCount: 3,
    status: "nina",
  },
  {
    id: "2",
    contact: { name: "Maria Santos", phone: "+55 21 98888-5678" },
    lastMessage: "Já tenho os documentos prontos",
    lastMessageAt: "09:45",
    unreadCount: 0,
    status: "human",
    assignedTo: "Victor",
  },
  {
    id: "3",
    contact: { name: "Pedro Oliveira", phone: "+55 31 97777-9012" },
    lastMessage: "Pode me explicar os requisitos?",
    lastMessageAt: "Ontem",
    unreadCount: 1,
    status: "paused",
  },
];

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "nina" | "human" | "paused">("all");

  const filteredConversations = mockConversations.filter((conv) => {
    const matchesSearch =
      conv.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact.phone.includes(searchTerm);
    const matchesFilter = filter === "all" || conv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: Conversation["status"]) => {
    switch (status) {
      case "nina":
        return <Bot className="h-3 w-3 text-blue-500" />;
      case "human":
        return <User className="h-3 w-3 text-green-500" />;
      case "paused":
        return <Clock className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: Conversation["status"]) => {
    switch (status) {
      case "nina":
        return "IA";
      case "human":
        return "Humano";
      case "paused":
        return "Pausado";
    }
  };

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
          {filteredConversations.map((conv) => (
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
                <AvatarImage src={conv.contact.avatar} />
                <AvatarFallback>
                  {conv.contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{conv.contact.name}</span>
                  <span className="text-xs text-muted-foreground">{conv.lastMessageAt}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {getStatusIcon(conv.status)}
                    <span className="ml-1">{getStatusLabel(conv.status)}</span>
                  </Badge>
                  {conv.assignedTo && (
                    <span className="text-xs text-muted-foreground">
                      → {conv.assignedTo}
                    </span>
                  )}
                </div>
              </div>

              {conv.unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground">
                  {conv.unreadCount}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
