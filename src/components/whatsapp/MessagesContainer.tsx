import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TransferIndicator } from "./TransferIndicator";
import { InternalMentionBubble } from "./InternalMentionBubble";
import { Tables } from "@/integrations/supabase/types";
import { format, isToday, isYesterday, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useMessageReactions, useInstanceTransfer, InstanceTransfer } from "@/hooks/whatsapp";
import { useConversationMentions, InternalMention } from "@/hooks/whatsapp/useMentions";

type Message = Tables<'whatsapp_messages'>;

interface MessagesContainerProps {
  messages: Message[];
  isLoading: boolean;
  conversationId: string | null;
  onReplyMessage?: (message: Message) => void;
}

// Combined type for timeline items
type TimelineItem = 
  | { type: 'message'; data: Message; timestamp: Date }
  | { type: 'transfer'; data: InstanceTransfer; timestamp: Date }
  | { type: 'mention'; data: InternalMention; timestamp: Date };

export const MessagesContainer = ({ messages = [], isLoading, conversationId, onReplyMessage }: MessagesContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const prevMessagesLengthRef = useRef(messages?.length || 0);
  const { reactionsByMessage } = useMessageReactions(conversationId);
  const { transfers } = useInstanceTransfer(conversationId);
  const { mentions } = useConversationMentions(conversationId);

  // Combine all timeline items and sort by timestamp
  const timelineItems = useMemo(() => {
    const safeMessages = messages || [];
    const safeTransfers = transfers || [];
    const safeMentions = mentions || [];
    
    const items: TimelineItem[] = [
      ...safeMessages
        .filter(m => m.sent_at) // Filtrar mensagens sem data
        .map(m => ({ 
          type: 'message' as const, 
          data: m, 
          timestamp: new Date(m.sent_at) 
        })),
      ...safeTransfers
        .filter(t => t.created_at)
        .map(t => ({ 
          type: 'transfer' as const, 
          data: t, 
          timestamp: new Date(t.created_at) 
        })),
      ...safeMentions
        .filter(m => m.created_at)
        .map(m => ({ 
          type: 'mention' as const, 
          data: m, 
          timestamp: new Date(m.created_at) 
        })),
    ];
    return items
      .filter(item => !isNaN(item.timestamp.getTime()))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, transfers, mentions]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const threshold = 100;
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setIsAtBottom(atBottom);
    
    if (atBottom) setNewMessagesCount(0);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setNewMessagesCount(0);
    }
  };

  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else if (messages.length > prevMessagesLengthRef.current) {
      setNewMessagesCount(prev => prev + (messages.length - prevMessagesLengthRef.current));
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isAtBottom]);

  const getDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    if (isSameWeek(date, new Date())) {
      return format(date, 'EEEE', { locale: ptBR });
    }
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  // Group timeline items by date
  const groupTimelineByDate = () => {
    const groups: { [key: string]: TimelineItem[] } = {};
    
    timelineItems.forEach(item => {
      // Validar se timestamp é uma data válida
      if (!item.timestamp || isNaN(item.timestamp.getTime())) {
        return; // Pular itens com data inválida
      }
      
      try {
        const dateKey = format(item.timestamp, 'yyyy-MM-dd');
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(item);
      } catch (e) {
        console.warn('Invalid date in message:', item);
      }
    });

    return Object.entries(groups).map(([dateKey, items]) => ({
      date: new Date(dateKey),
      items,
    }));
  };

  const timelineGroups = groupTimelineByDate();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0">
      <ScrollArea className="h-full p-4" viewportRef={scrollRef} onScroll={handleScroll}>
        <div className="space-y-4">
          {timelineGroups.map((group, idx) => (
            <div key={idx}>
              <div className="flex justify-center my-4">
                <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  {getDateSeparator(group.date)}
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((item) => {
                  if (item.type === 'message') {
                    return (
                      <MessageBubble 
                        key={item.data.id} 
                        message={item.data}
                        reactions={reactionsByMessage[item.data.message_id]}
                        onReply={onReplyMessage}
                      />
                    );
                  }
                  if (item.type === 'transfer') {
                    return <TransferIndicator key={item.data.id} transfer={item.data} />;
                  }
                  if (item.type === 'mention') {
                    return <InternalMentionBubble key={item.data.id} mention={item.data} />;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="absolute bottom-6 right-6 rounded-full shadow-lg bg-background hover:bg-accent border border-border z-10"
        >
          <ChevronDown className="h-5 w-5 text-foreground" />
          {newMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 font-semibold">
              {newMessagesCount > 99 ? '99+' : newMessagesCount}
            </span>
          )}
        </Button>
      )}
    </div>
  );
};
