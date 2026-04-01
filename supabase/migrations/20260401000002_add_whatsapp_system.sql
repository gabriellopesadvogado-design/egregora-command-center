-- ============================================================================
-- SISTEMA DE WHATSAPP - Egrégora Command Center
-- ============================================================================

-- ENUMs
DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('nina', 'human', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_from AS ENUM ('user', 'nina', 'human');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed', 'processing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text', 'audio', 'image', 'document', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- INSTÂNCIAS WHATSAPP
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('recepcao', 'sdr', 'closer', 'processos')),
  api_type TEXT NOT NULL CHECK (api_type IN ('oficial', 'nao_oficial')),
  evolution_instance_name TEXT,
  evolution_api_url TEXT,
  evolution_api_key TEXT,
  phone_number TEXT,
  is_connected BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- CONTATOS WHATSAPP
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  whatsapp_id TEXT,
  name TEXT,
  call_name TEXT,
  email TEXT,
  profile_picture_url TEXT,
  
  -- Vinculação com CRM
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  -- Tags e notas
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Memória do cliente para IA
  client_memory JSONB DEFAULT '{
    "last_updated": null,
    "lead_profile": {
      "interests": [],
      "lead_stage": "new",
      "objections": [],
      "products_discussed": [],
      "communication_style": "unknown",
      "qualification_score": 0
    },
    "sales_intelligence": {
      "pain_points": [],
      "next_best_action": "qualify",
      "budget_indication": "unknown",
      "decision_timeline": "unknown"
    },
    "interaction_summary": {
      "response_pattern": "unknown",
      "last_contact_reason": "",
      "total_conversations": 0
    }
  }'::jsonb,
  
  -- Bloqueio
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  
  -- Timestamps
  first_contact_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- CONVERSAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  
  -- Status e atribuição
  status conversation_status NOT NULL DEFAULT 'nina',
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_to UUID REFERENCES public.core_users(id) ON DELETE SET NULL,
  
  -- Contexto
  tags TEXT[] DEFAULT '{}',
  nina_context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- MENSAGENS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  
  -- Origem e conteúdo
  message_from message_from NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  
  -- Status
  status message_status NOT NULL DEFAULT 'sent',
  whatsapp_message_id TEXT,
  
  -- Quem enviou (se humano)
  sent_by_user_id UUID REFERENCES public.core_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- FILA DE PROCESSAMENTO NINA (IA)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_nina_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  
  -- Processamento
  status queue_status NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  
  -- Contexto para IA
  messages_context JSONB,
  ai_response TEXT,
  ai_action TEXT,
  ai_confidence NUMERIC,
  
  -- Erros
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- FILA DE ENVIO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  
  -- Conteúdo
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  
  -- Status
  status queue_status NOT NULL DEFAULT 'pending',
  whatsapp_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- CONFIGURAÇÕES NINA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_nina_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  
  -- Configurações
  system_prompt TEXT,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 500,
  
  -- Comportamento
  auto_qualify BOOLEAN DEFAULT true,
  auto_transfer BOOLEAN DEFAULT true,
  business_hours_only BOOLEAN DEFAULT false,
  business_hours_start TIME DEFAULT '09:00',
  business_hours_end TIME DEFAULT '18:00',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_nina_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_nina_settings ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para authenticated
CREATE POLICY "Authenticated can view all whatsapp data"
ON public.whatsapp_instances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can view all contacts"
ON public.whatsapp_contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can view all conversations"
ON public.whatsapp_conversations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can view all messages"
ON public.whatsapp_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage instances"
ON public.whatsapp_instances FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can manage contacts"
ON public.whatsapp_contacts FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage conversations"
ON public.whatsapp_conversations FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage messages"
ON public.whatsapp_messages FOR ALL TO authenticated USING (true);

CREATE POLICY "System can manage queues"
ON public.whatsapp_nina_queue FOR ALL TO authenticated USING (true);

CREATE POLICY "System can manage send queue"
ON public.whatsapp_send_queue FOR ALL TO authenticated USING (true);

CREATE POLICY "Admin can manage nina settings"
ON public.whatsapp_nina_settings FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- ÍNDICES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wa_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_lead ON public.whatsapp_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_contact ON public.whatsapp_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_assigned ON public.whatsapp_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_sent_at ON public.whatsapp_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_nina_queue_status ON public.whatsapp_nina_queue(status);
CREATE INDEX IF NOT EXISTS idx_wa_send_queue_status ON public.whatsapp_send_queue(status);

-- -----------------------------------------------------------------------------
-- TRIGGERS
-- -----------------------------------------------------------------------------
CREATE TRIGGER update_wa_contacts_updated_at
BEFORE UPDATE ON public.whatsapp_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_nina_settings_updated_at
BEFORE UPDATE ON public.whatsapp_nina_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
