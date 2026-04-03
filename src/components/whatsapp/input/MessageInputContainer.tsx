import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mic, Clock } from "lucide-react";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { MediaUploadButton } from "./MediaUploadButton";
import { AIComposerButton } from "./AIComposerButton";
import { AudioRecorder } from "./AudioRecorder";
import { MacroSuggestions } from "./MacroSuggestions";
import { MentionSuggestions } from "./MentionSuggestions";
import { SmartReplySuggestions } from "./SmartReplySuggestions";
import { ReplyPreview } from "./ReplyPreview";
import { ScheduleMessagePopover } from "./ScheduleMessagePopover";
import { useWhatsAppMacros } from "@/hooks/whatsapp/useWhatsAppMacros";
import { useSmartReply } from "@/hooks/whatsapp/useSmartReply";
import { useScheduleMessage } from "@/hooks/whatsapp/useScheduleMessage";
import { useCreateMention } from "@/hooks/whatsapp/useMentions";
import { useAgents } from "@/hooks/useAgents";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Message = Tables<'whatsapp_messages'>;

export interface MediaSendParams {
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
  content?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  mediaMimetype?: string;
  fileName?: string;
}

interface MessageInputContainerProps {
  conversationId: string;
  contactId?: string;
  instanceId?: string;
  disabled?: boolean;
  replyingTo?: Message | null;
  onSendText: (content: string, quotedMessageId?: string) => void;
  onSendMedia: (params: MediaSendParams) => void;
  onCancelReply?: () => void;
}

export const MessageInputContainer = ({ 
  conversationId,
  contactId,
  instanceId,
  disabled,
  replyingTo,
  onSendText, 
  onSendMedia,
  onCancelReply
}: MessageInputContainerProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showMacroSuggestions, setShowMacroSuggestions] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [filteredMacros, setFilteredMacros] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { macros, incrementUsage } = useWhatsAppMacros();
  const { suggestions, isLoading: isLoadingSmartReplies, isRefreshing, refresh } = useSmartReply(conversationId);
  const scheduleMutation = useScheduleMessage();
  const createMention = useCreateMention();
  const { agents } = useAgents();

  const handleSchedule = (scheduledAt: Date) => {
    if (!message.trim() || !contactId || !instanceId) return;
    
    // Compatibilidade: suporta tanto message_id quanto whatsapp_message_id
    const quotedId = (replyingTo as any)?.whatsapp_message_id || (replyingTo as any)?.message_id;
    
    scheduleMutation.mutate({
      conversationId,
      contactId,
      instanceId,
      scheduledAt,
      content: message.trim(),
      messageType: 'text',
      quotedMessageId: quotedId || undefined,
    });
    
    setMessage("");
    onCancelReply?.();
  };

  // Detect /macro: command and filter macros
  useEffect(() => {
    const match = message.match(/\/(\S*)$/i);
    if (match) {
      const searchTerm = match[1].toLowerCase();
      const filtered = macros.filter(m => 
        m.shortcut.toLowerCase().includes(searchTerm) ||
        m.name.toLowerCase().includes(searchTerm)
      );
      setFilteredMacros(filtered);
      setShowMacroSuggestions(filtered.length > 0);
    } else {
      setShowMacroSuggestions(false);
      setFilteredMacros([]);
    }
  }, [message, macros]);

  // Detect @mention pattern
  useEffect(() => {
    const match = message.match(/@(\S*)$/);
    if (match) {
      setMentionSearchTerm(match[1]);
      setShowMentionSuggestions(true);
      setMentionSelectedIndex(0);
    } else {
      setShowMentionSuggestions(false);
      setMentionSearchTerm("");
    }
  }, [message]);

  // Parse mentions from message and create internal mentions
  const parseMentionsAndSend = async (content: string) => {
    // Check if message starts with @ - it's an internal mention only
    if (content.startsWith('@')) {
      const mentionMatch = content.match(/^@(\S+)\s*(.*)/);
      if (mentionMatch) {
        const mentionedName = mentionMatch[1];
        const messageContent = mentionMatch[2] || content;
        
        // Find the agent by name
        const agent = agents.find(a => 
          a.full_name.toLowerCase().replace(/\s+/g, '') === mentionedName.toLowerCase().replace(/\s+/g, '') ||
          a.full_name.toLowerCase().startsWith(mentionedName.toLowerCase())
        );
        
        if (agent) {
          try {
            await createMention.mutateAsync({
              conversationId,
              mentionedUserId: agent.id,
              content: content,
            });
            toast.success(`Menção enviada para ${agent.full_name}`);
          } catch (error) {
            toast.error("Erro ao enviar menção");
          }
        } else {
          toast.error("Agente não encontrado");
        }
        return; // Don't send to WhatsApp
      }
    }
    
    // Regular message - send to WhatsApp
    // Compatibilidade: suporta tanto message_id quanto whatsapp_message_id
    const quotedId = (replyingTo as any)?.whatsapp_message_id || (replyingTo as any)?.message_id;
    onSendText(content, quotedId);
  };

  const handleSend = async () => {
    if (message.trim() && !disabled) {
      await parseMentionsAndSend(message.trim());
      setMessage("");
      onCancelReply?.();
    }
  };

  const handleAgentSelect = (agent: { id: string; full_name: string }) => {
    // Replace the @search with @FullName 
    const newMessage = message.replace(/@\S*$/, `@${agent.full_name.replace(/\s+/g, '')} `);
    setMessage(newMessage);
    setShowMentionSuggestions(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention suggestions navigation
    if (showMentionSuggestions) {
      const filteredAgents = agents.filter(a => 
        a.full_name.toLowerCase().includes(mentionSearchTerm.toLowerCase())
      );
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => Math.min(prev + 1, filteredAgents.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' && filteredAgents.length > 0) {
        e.preventDefault();
        handleAgentSelect(filteredAgents[mentionSelectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = message;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    setMessage(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + emoji.length;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleMacroSelect = (macro: any) => {
    setMessage(macro.content);
    incrementUsage(macro.id);
    setShowMacroSuggestions(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSmartReplySelect = (text: string) => {
    setMessage(text);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  if (isRecording) {
    return (
      <div className="p-4 border-t border-border bg-card">
        <AudioRecorder
          onSend={(params) => {
            onSendMedia(params);
            setIsRecording(false);
          }}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card flex-shrink-0">
      {replyingTo && onCancelReply && (
        <ReplyPreview message={replyingTo} onCancel={onCancelReply} />
      )}
      
      <SmartReplySuggestions
        suggestions={suggestions}
        isLoading={isLoadingSmartReplies}
        isRefreshing={isRefreshing}
        onSelectSuggestion={handleSmartReplySelect}
        onRefresh={refresh}
      />
      
      <div className="p-4 pb-6">
        <div className="relative">
          {showMacroSuggestions && (
            <MacroSuggestions
              macros={filteredMacros}
              onSelect={handleMacroSelect}
            />
          )}
          
          {showMentionSuggestions && agents.length > 0 && (
            <MentionSuggestions
              agents={agents}
              searchTerm={mentionSearchTerm}
              selectedIndex={mentionSelectedIndex}
              onSelect={handleAgentSelect}
            />
          )}
        </div>
        
        <div className="flex gap-2 items-end">
          {/* Botões à esquerda */}
          <div className="flex gap-1 flex-shrink-0">
            <EmojiPickerButton onEmojiSelect={handleEmojiSelect} disabled={disabled} />
            
            <MediaUploadButton 
              conversationId={conversationId}
              onSendMedia={onSendMedia}
              disabled={disabled}
            />
            
            <AIComposerButton
              message={message}
              onComposed={(newMessage) => setMessage(newMessage)}
              disabled={disabled}
            />
          </div>
          
          {/* Campo de texto */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className="min-h-[44px] max-h-32 resize-none flex-1"
            disabled={disabled}
          />
          
          {/* Botões à direita */}
          <div className="flex gap-1 flex-shrink-0">
            {message.trim() ? (
              <>
                {contactId && instanceId && (
                  <ScheduleMessagePopover
                    disabled={disabled || scheduleMutation.isPending}
                    onSchedule={handleSchedule}
                    trigger={
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={disabled || scheduleMutation.isPending}
                        title="Agendar envio"
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                    }
                  />
                )}
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={disabled}
                  title="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsRecording(true)}
                size="icon"
                variant="outline"
                title="Gravar áudio"
                disabled={disabled}
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};
