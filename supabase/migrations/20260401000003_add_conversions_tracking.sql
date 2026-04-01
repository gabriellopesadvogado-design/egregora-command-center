-- ============================================================================
-- CONVERSIONS TRACKING - Loop fechado de conversão
-- ============================================================================

-- Tabela para eventos de conversão enviados
CREATE TABLE IF NOT EXISTS public.conversions_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vinculação
  meeting_id UUID REFERENCES public.crm_meetings(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  -- Plataforma destino
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  
  -- Dados do evento
  event_name TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  value NUMERIC,
  currency TEXT DEFAULT 'BRL',
  
  -- Dados de atribuição
  pixel_id TEXT,
  conversion_action_id TEXT,
  fbc TEXT, -- Facebook Click ID
  fbp TEXT, -- Facebook Browser ID
  gclid TEXT, -- Google Click ID
  
  -- User data (hashed)
  user_email_hash TEXT,
  user_phone_hash TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  response_data JSONB,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Configurações de Conversions API
CREATE TABLE IF NOT EXISTS public.conversions_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meta
  meta_pixel_id TEXT,
  meta_conversions_token TEXT,
  meta_test_event_code TEXT,
  meta_enabled BOOLEAN DEFAULT false,
  
  -- Google
  google_conversion_id TEXT,
  google_conversion_label TEXT,
  google_enabled BOOLEAN DEFAULT false,
  
  -- Configurações gerais
  send_on_deal_won BOOLEAN DEFAULT true,
  include_value BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.conversions_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversions_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view conversions"
ON public.conversions_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert conversions"
ON public.conversions_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can manage conversions settings"
ON public.conversions_settings FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- Índices
CREATE INDEX IF NOT EXISTS idx_conversions_meeting ON public.conversions_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON public.conversions_events(status);
CREATE INDEX IF NOT EXISTS idx_conversions_platform ON public.conversions_events(platform);

-- Trigger para updated_at
CREATE TRIGGER update_conversions_settings_updated_at
BEFORE UPDATE ON public.conversions_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
