import { useState } from "react";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatArea } from "@/components/whatsapp/ChatArea";
import { ConversationDetailsSidebar } from "@/components/whatsapp/details/ConversationDetailsSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings, Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWhatsAppInstances } from "@/hooks/whatsapp";

export default function Conversas() {
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { instances, isLoading } = useWhatsAppInstances();
  
  const hasActiveInstance = instances.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!hasActiveInstance) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Configure o WhatsApp</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Para gerenciar conversas, configure a integração com WhatsApp (Evolution API) nas configurações.
        </p>
        <div className="flex gap-3 mt-4">
          <Button onClick={() => navigate("/settings")} variant="default">
            <Settings className="h-4 w-4 mr-2" />
            Configurar WhatsApp
          </Button>
          <Button onClick={() => navigate("/leads")} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Ver Leads
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Lista de Conversas */}
      <Card className="w-80 flex-shrink-0 overflow-hidden">
        <ConversationList
          selectedId={selectedConversation}
          onSelect={setSelectedConversation}
        />
      </Card>

      {/* Área de Chat */}
      <Card className="flex-1 overflow-hidden">
        {selectedConversation ? (
          <ChatArea
            conversationId={selectedConversation}
            onToggleDetails={() => setShowDetails(!showDetails)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </Card>

      {/* Sidebar de Detalhes */}
      {showDetails && selectedConversation && (
        <Card className="w-80 flex-shrink-0 overflow-hidden">
          <ConversationDetailsSidebar
            conversationId={selectedConversation}
            onClose={() => setShowDetails(false)}
          />
        </Card>
      )}
    </div>
  );
}
