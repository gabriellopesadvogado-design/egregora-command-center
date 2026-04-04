-- Migration: Política de visibilidade por cargo (SDR vê só os seus, Admin vê tudo)
-- Aplicado em: whatsapp_contacts, whatsapp_conversations, whatsapp_messages

-- =============================================================================
-- 1. Adicionar campo assigned_user_id em whatsapp_contacts (se não existir)
-- =============================================================================

ALTER TABLE public.whatsapp_contacts
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.core_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_contacts_assigned ON public.whatsapp_contacts(assigned_user_id);

COMMENT ON COLUMN public.whatsapp_contacts.assigned_user_id IS 'SDR/Closer responsável pelo contato';

-- =============================================================================
-- 2. Criar tabela de mapeamento auth.users -> core_users
-- =============================================================================

-- Essa tabela conecta o auth.uid() com o core_users.id
CREATE TABLE IF NOT EXISTS public.user_auth_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL, -- auth.uid()
  core_user_id UUID UNIQUE NOT NULL REFERENCES public.core_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_auth_mapping_auth ON public.user_auth_mapping(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_mapping_core ON public.user_auth_mapping(core_user_id);

ALTER TABLE public.user_auth_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mapping"
ON public.user_auth_mapping FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- =============================================================================
-- 3. Funções auxiliares para verificar permissões
-- =============================================================================

-- Função para obter o core_user_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_current_core_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT core_user_id FROM public.user_auth_mapping WHERE auth_user_id = auth.uid();
$$;

-- Função para verificar se o usuário logado é admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_auth_mapping uam
    JOIN public.core_users cu ON cu.id = uam.core_user_id
    WHERE uam.auth_user_id = auth.uid()
      AND cu.cargo = 'admin'
      AND cu.ativo = true
  );
$$;

-- Função para verificar se o usuário tem acesso a um contato específico
CREATE OR REPLACE FUNCTION public.user_can_access_contact(contact_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (
    -- Admin vê tudo
    public.is_current_user_admin()
    OR
    -- SDR/Closer vê apenas os seus
    EXISTS (
      SELECT 1 FROM public.whatsapp_contacts c
      WHERE c.id = contact_id
        AND c.assigned_user_id = public.get_current_core_user_id()
    )
    OR
    -- Também pode ver se a conversa está atribuída a ele
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations conv
      WHERE conv.contact_id = contact_id
        AND conv.assigned_to = public.get_current_core_user_id()
    )
  );
$$;

-- Função para verificar se o usuário tem acesso a uma conversa específica
CREATE OR REPLACE FUNCTION public.user_can_access_conversation(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (
    -- Admin vê tudo
    public.is_current_user_admin()
    OR
    -- SDR/Closer vê apenas as suas
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations c
      WHERE c.id = conv_id
        AND c.assigned_to = public.get_current_core_user_id()
    )
    OR
    -- Também pode ver se o contato está atribuído a ele
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations conv
      JOIN public.whatsapp_contacts cont ON cont.id = conv.contact_id
      WHERE conv.id = conv_id
        AND cont.assigned_user_id = public.get_current_core_user_id()
    )
  );
$$;

-- =============================================================================
-- 4. Atualizar RLS em whatsapp_contacts
-- =============================================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated can view all contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Authenticated can manage contacts" ON public.whatsapp_contacts;

-- Criar novas policies com visibilidade por cargo
CREATE POLICY "Users can view assigned contacts"
ON public.whatsapp_contacts FOR SELECT TO authenticated
USING (
  -- Admin vê tudo
  public.is_current_user_admin()
  OR
  -- SDR/Closer vê apenas os atribuídos a ele
  assigned_user_id = public.get_current_core_user_id()
  OR
  -- Também pode ver se tem conversa atribuída
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations conv
    WHERE conv.contact_id = id
      AND conv.assigned_to = public.get_current_core_user_id()
  )
  OR
  -- Contatos não atribuídos podem ser vistos por todos (fila)
  assigned_user_id IS NULL
);

CREATE POLICY "Users can insert contacts"
ON public.whatsapp_contacts FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update assigned contacts"
ON public.whatsapp_contacts FOR UPDATE TO authenticated
USING (
  public.is_current_user_admin()
  OR assigned_user_id = public.get_current_core_user_id()
  OR assigned_user_id IS NULL
);

-- =============================================================================
-- 5. Atualizar RLS em whatsapp_conversations
-- =============================================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated can view all conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Authenticated can manage conversations" ON public.whatsapp_conversations;

-- Criar novas policies com visibilidade por cargo
CREATE POLICY "Users can view assigned conversations"
ON public.whatsapp_conversations FOR SELECT TO authenticated
USING (
  -- Admin vê tudo
  public.is_current_user_admin()
  OR
  -- SDR/Closer vê apenas as atribuídas a ele
  assigned_to = public.get_current_core_user_id()
  OR
  -- Também pode ver se o contato está atribuído a ele
  EXISTS (
    SELECT 1 FROM public.whatsapp_contacts cont
    WHERE cont.id = contact_id
      AND cont.assigned_user_id = public.get_current_core_user_id()
  )
  OR
  -- Conversas não atribuídas podem ser vistas por todos (fila)
  assigned_to IS NULL
);

CREATE POLICY "Users can insert conversations"
ON public.whatsapp_conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update assigned conversations"
ON public.whatsapp_conversations FOR UPDATE TO authenticated
USING (
  public.is_current_user_admin()
  OR assigned_to = public.get_current_core_user_id()
  OR assigned_to IS NULL
);

-- =============================================================================
-- 6. Atualizar RLS em whatsapp_messages
-- =============================================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated can view all messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated can manage messages" ON public.whatsapp_messages;

-- Criar novas policies com visibilidade por conversa
CREATE POLICY "Users can view messages from assigned conversations"
ON public.whatsapp_messages FOR SELECT TO authenticated
USING (
  -- Admin vê tudo
  public.is_current_user_admin()
  OR
  -- Pode ver se tem acesso à conversa
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations conv
    WHERE conv.id = conversation_id
      AND (
        conv.assigned_to = public.get_current_core_user_id()
        OR conv.assigned_to IS NULL
        OR EXISTS (
          SELECT 1 FROM public.whatsapp_contacts cont
          WHERE cont.id = conv.contact_id
            AND cont.assigned_user_id = public.get_current_core_user_id()
        )
      )
  )
);

CREATE POLICY "Users can insert messages"
ON public.whatsapp_messages FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update messages from assigned conversations"
ON public.whatsapp_messages FOR UPDATE TO authenticated
USING (
  public.is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.whatsapp_conversations conv
    WHERE conv.id = conversation_id
      AND (
        conv.assigned_to = public.get_current_core_user_id()
        OR conv.assigned_to IS NULL
      )
  )
);

-- =============================================================================
-- 7. Trigger para atribuir automaticamente quando lead entra na fila
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_contact_from_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Quando lead sai da fila de automação com SDR definido, atribui o contato
  IF NEW.status IN ('fallback_sdr', 'waiting_response', 'qualifying') 
     AND NEW.sdr_user_id IS NOT NULL 
     AND NEW.contact_id IS NOT NULL THEN
    
    UPDATE public.whatsapp_contacts
    SET assigned_user_id = NEW.sdr_user_id
    WHERE id = NEW.contact_id
      AND assigned_user_id IS NULL;
    
    -- Também atribui a conversa se existir
    UPDATE public.whatsapp_conversations
    SET assigned_to = NEW.sdr_user_id
    WHERE contact_id = NEW.contact_id
      AND assigned_to IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_contact ON public.lead_automation_queue;

CREATE TRIGGER trigger_auto_assign_contact
AFTER UPDATE ON public.lead_automation_queue
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_contact_from_queue();

-- =============================================================================
-- 8. Comentários explicativos
-- =============================================================================

COMMENT ON FUNCTION public.get_current_core_user_id() IS 'Retorna o core_user_id do usuário autenticado';
COMMENT ON FUNCTION public.is_current_user_admin() IS 'Verifica se o usuário autenticado é admin';
COMMENT ON FUNCTION public.user_can_access_contact(UUID) IS 'Verifica se o usuário pode acessar um contato específico';
COMMENT ON FUNCTION public.user_can_access_conversation(UUID) IS 'Verifica se o usuário pode acessar uma conversa específica';
COMMENT ON TABLE public.user_auth_mapping IS 'Mapeia auth.users para core_users (necessário para RLS)';
