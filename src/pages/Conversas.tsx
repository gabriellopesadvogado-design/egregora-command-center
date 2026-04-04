import { useState, useEffect } from "react";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatArea } from "@/components/whatsapp/ChatArea";
import { ConversationDetailsSidebar } from "@/components/whatsapp/details/ConversationDetailsSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings, Users, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWhatsAppInstances } from "@/hooks/whatsapp";

export default function Conversas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contactIdFromUrl = searchParams.get("contact");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(contactIdFromUrl);
  
  // Atualizar conversa selecionada quando URL mudar
  useEffect(() => {
    if (contactIdFromUrl) {
      setSelectedConversation(contactIdFromUrl);
    }
  }, [contactIdFromUrl]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
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
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-4">
      {/* Seletor de Instâncias */}
      <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
        <button
          onClick={() => setSelectedInstanceId(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedInstanceId === null
              ? 'bg-[#041E42] text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Todas
        </button>
        {instances.map((inst) => (
          <button
            key={inst.id}
            onClick={() => setSelectedInstanceId(inst.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedInstanceId === inst.id
                ? 'bg-[#041E42] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {inst.nome}
          </button>
        ))}
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
      {/* Lista de Conversas */}
      <Card className="w-80 flex-shrink-0 overflow-hidden flex flex-col">
        <ConversationList
          selectedId={selectedConversation}
          onSelect={setSelectedConversation}
          instanceId={selectedInstanceId}
        />
      </Card>

      {/* Área de Chat */}
      <Card className="flex-1 overflow-hidden flex flex-col">
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
    </div>
  );
}
