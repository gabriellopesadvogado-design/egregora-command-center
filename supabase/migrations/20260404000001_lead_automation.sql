-- Migration: Sistema de automação de leads
-- Adiciona identificação HubSpot e fila de automação

-- 1. Adicionar hubspot_contact_id aos contatos
ALTER TABLE public.whatsapp_contacts
ADD COLUMN IF NOT EXISTS hubspot_contact_id TEXT,
ADD COLUMN IF NOT EXISTS hubspot_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wa_contacts_hubspot ON public.whatsapp_contacts(hubspot_contact_id);

-- 2. Adicionar hubspot_contact_id aos leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS hubspot_contact_id TEXT,
ADD COLUMN IF NOT EXISTS hubspot_deal_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_hubspot ON public.leads(hubspot_contact_id);

-- 3. Tabela de fila de automação de leads
CREATE TABLE IF NOT EXISTS public.lead_automation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do lead
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  hubspot_contact_id TEXT,
  
  -- Dados do lead
  lead_name TEXT,
  lead_email TEXT,
  
  -- Vinculação com SDR
  sdr_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sdr_instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  
  -- Status da automação
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN (
    'waiting',           -- Aguardando 5 minutos
    'waiting_response',  -- Template enviado, aguardando resposta
    'qualifying',        -- Em qualificação com Nina
    'qualified',         -- Qualificado
    'disqualified',      -- Desqualificado
    'error',             -- Erro no envio
    'fallback_sdr',      -- Fallback para SDR
    'completed'          -- Processo completo
  )),
  
  -- Controle de tempo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  wait_until TIMESTAMPTZ, -- Quando enviar o template (created_at + 5 min)
  template_sent_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  
  -- Controle de tentativas
  template_attempts INT DEFAULT 0,
  last_error TEXT,
  
  -- Metadados
  source TEXT, -- 'hubspot', 'meta_ads', 'manual', etc
  campaign_id TEXT,
  ad_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_queue_status ON public.lead_automation_queue(status);
CREATE INDEX IF NOT EXISTS idx_lead_queue_wait ON public.lead_automation_queue(wait_until) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_lead_queue_phone ON public.lead_automation_queue(phone_number);

-- 4. Tabela de configuração de templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  template_id TEXT NOT NULL, -- ID do template no Meta
  language TEXT NOT NULL DEFAULT 'pt_BR',
  
  -- Conteúdo
  header_type TEXT CHECK (header_type IN ('text', 'image', 'video', 'document')),
  header_content TEXT,
  body TEXT NOT NULL,
  footer TEXT,
  
  -- Botões
  buttons JSONB DEFAULT '[]',
  
  -- Variáveis
  variables JSONB DEFAULT '[]', -- [{name: 'nome', position: 1}]
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Histórico de automação
CREATE TABLE IF NOT EXISTS public.lead_automation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.lead_automation_queue(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'created', 'template_sent', 'template_error', 'response_received', 'qualified', etc
  details JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_log_queue ON public.lead_automation_log(queue_id);

-- 6. RLS
ALTER TABLE public.lead_automation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lead queue"
ON public.lead_automation_queue FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert lead queue"
ON public.lead_automation_queue FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update lead queue"
ON public.lead_automation_queue FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can view templates"
ON public.whatsapp_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage templates"
ON public.whatsapp_templates FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE POLICY "Authenticated can view automation logs"
ON public.lead_automation_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert automation logs"
ON public.lead_automation_log FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Função para processar fila de automação
CREATE OR REPLACE FUNCTION process_lead_automation_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar leads que passaram do tempo de espera (5 min)
  UPDATE public.lead_automation_queue
  SET status = 'waiting_response',
      updated_at = now()
  WHERE status = 'waiting'
    AND wait_until <= now()
    AND template_sent_at IS NULL;
END;
$$;

COMMENT ON TABLE public.lead_automation_queue IS 'Fila de automação de leads - controla o fluxo de qualificação';
COMMENT ON TABLE public.whatsapp_templates IS 'Templates de mensagens aprovados no Meta';
COMMENT ON TABLE public.lead_automation_log IS 'Log de ações da automação de leads';
