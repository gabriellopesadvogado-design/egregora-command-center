import { useState } from "react";
import { useWhatsAppMessages, useWhatsAppSendMessage, useWhatsAppSentiment } from "@/hooks/whatsapp";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChatHeader } from "./ChatHeader";
import { MessagesContainer } from "./MessagesContainer";
import { MessageInputContainer, MediaSendParams } from "./input";
import { PendingTransferBanner } from "./PendingTransferBanner";
import { MessageCircle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Message = Tables<'whatsapp_messages'>;

interface ChatAreaProps {
  conversationId: string | null;
}

export const ChatArea = ({ conversationId }: ChatAreaProps) => {
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const { messages, isLoading: messagesLoading } = useWhatsAppMessages(conversationId);
  const { sentiment, isAnalyzing, analyze } = useWhatsAppSentiment(conversationId);
  const sendMutation = useWhatsAppSendMessage();
  const queryClient = useQueryClient();

  // Fetch conversation details including contact
  const { data: conversation, refetch: refetchConversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      console.log('[ChatArea] Fetching conversation:', conversationId);
      
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:whatsapp_contacts(*)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      console.log('[ChatArea] Conversation fetched, contact:', data?.contact?.name);
      return data;
    },
    enabled: !!conversationId,
    staleTime: 0, // Sempre considerar dados como stale
    refetchOnMount: true,
  });

  const handleRefresh = async () => {
    if (!conversationId) return;
    console.log('[ChatArea] handleRefresh called');
    await queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    await queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    // Forçar refetch
    refetchConversation();
  };

  const handleSendText = (content: string, quotedMessageId?: string) => {
    if (!conversationId || !content.trim()) return;
    
    sendMutation.mutate({
      conversationId,
      content,
      messageType: 'text',
      quotedMessageId,
    });
    setReplyingTo(null);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMedia = (params: MediaSendParams) => {
    if (!conversationId) return;
    
    sendMutation.mutate({
      conversationId,
      ...params,
    });
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-3">
          <MessageCircle className="w-24 h-24 mx-auto text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">
            Selecione uma conversa
          </h3>
          <p className="text-sm text-muted-foreground">
            Escolha uma conversa na lista para começar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <ChatHeader
        contact={conversation?.contact}
        sentiment={sentiment}
        isAnalyzing={isAnalyzing}
        onAnalyze={analyze}
        conversationId={conversationId}
        conversation={conversation}
        onRefresh={handleRefresh}
      />
      
      <PendingTransferBanner conversationId={conversationId} />
      
      <MessagesContainer 
        messages={messages} 
        isLoading={messagesLoading}
        conversationId={conversationId}
        onReplyMessage={handleReply}
      />
      
      <MessageInputContainer
        conversationId={conversationId}
        contactId={conversation?.contact_id}
        instanceId={conversation?.instance_id}
        replyingTo={replyingTo}
        onSendText={handleSendText}
        onSendMedia={handleSendMedia}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
};
