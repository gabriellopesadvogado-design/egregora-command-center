-- ============================================================================
-- Z-API MIGRATION - Egrégora Command Center
-- Adiciona suporte à Z-API como alternativa à Evolution API
-- ============================================================================

-- 1. Adicionar colunas Z-API na tabela de instâncias
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'evolution' CHECK (provider IN ('evolution', 'zapi')),
ADD COLUMN IF NOT EXISTS zapi_instance_id TEXT,
ADD COLUMN IF NOT EXISTS zapi_token TEXT,
ADD COLUMN IF NOT EXISTS zapi_security_token TEXT;

-- 2. Criar índice para busca por provider
CREATE INDEX IF NOT EXISTS idx_wa_instances_provider ON public.whatsapp_instances(provider);

-- 3. Comentários para documentação
COMMENT ON COLUMN public.whatsapp_instances.provider IS 'Provider de WhatsApp: evolution ou zapi';
COMMENT ON COLUMN public.whatsapp_instances.zapi_instance_id IS 'ID da instância na Z-API';
COMMENT ON COLUMN public.whatsapp_instances.zapi_token IS 'Token de autenticação da Z-API';
COMMENT ON COLUMN public.whatsapp_instances.zapi_security_token IS 'Token de segurança para webhooks da Z-API';

-- ============================================================================
-- LEAD ATTRIBUTION - Tracking completo de tráfego pago
-- ============================================================================

-- Tabela principal de atribuição
CREATE TABLE IF NOT EXISTS public.lead_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificadores do lead (para match posterior)
  email TEXT,
  phone TEXT,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  -- Source de entrada
  source TEXT NOT NULL, -- 'landing_page', 'site', 'whatsapp_direct', 'organic', 'referral'
  landing_page TEXT,
  referrer TEXT,
  
  -- UTM Parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Click IDs (CRÍTICO para CAPI)
  fbclid TEXT,          -- Facebook Click ID
  fbc TEXT,             -- Facebook Cookie (fbclid + timestamp)
  fbp TEXT,             -- Facebook Browser ID
  gclid TEXT,           -- Google Click ID
  wbraid TEXT,          -- Google Web-to-App
  gbraid TEXT,          -- Google App-to-Web
  
  -- Metadados do navegador
  user_agent TEXT,
  ip_hash TEXT,         -- Hash do IP (LGPD compliance)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para match e análise
CREATE INDEX IF NOT EXISTS idx_attribution_email ON public.lead_attribution(email);
CREATE INDEX IF NOT EXISTS idx_attribution_phone ON public.lead_attribution(phone);
CREATE INDEX IF NOT EXISTS idx_attribution_lead ON public.lead_attribution(lead_id);
CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON public.lead_attribution(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_attribution_source ON public.lead_attribution(utm_source);
CREATE INDEX IF NOT EXISTS idx_attribution_fbclid ON public.lead_attribution(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attribution_gclid ON public.lead_attribution(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attribution_created ON public.lead_attribution(created_at DESC);

-- RLS
ALTER TABLE public.lead_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lead_attribution"
ON public.lead_attribution FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert lead_attribution"
ON public.lead_attribution FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can manage lead_attribution"
ON public.lead_attribution FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- PAGES - Sistema de Landing Pages Nativo
-- ============================================================================

-- Tabela de páginas
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('landing_page', 'site_page', 'blog_post')),
  
  -- Conteúdo
  content JSONB NOT NULL DEFAULT '{}',
  template TEXT DEFAULT 'default',
  custom_css TEXT,
  custom_js TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  
  -- Form config
  form_enabled BOOLEAN DEFAULT true,
  form_fields JSONB DEFAULT '[
    {"name": "name", "label": "Nome", "type": "text", "required": true},
    {"name": "email", "label": "E-mail", "type": "email", "required": true},
    {"name": "phone", "label": "WhatsApp", "type": "tel", "required": true}
  ]',
  form_redirect_url TEXT,
  form_webhook_url TEXT,
  
  -- Tracking automático
  meta_pixel_id TEXT,
  google_tag_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  
  -- Métricas agregadas
  views_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN views_count > 0 
    THEN (conversions_count::decimal / views_count * 100)
    ELSE 0 END
  ) STORED,
  
  -- Ownership
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversões das páginas (com tracking completo)
CREATE TABLE IF NOT EXISTS public.page_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  
  -- Dados do form
  form_data JSONB NOT NULL,
  
  -- Tracking (capturado automaticamente pelo JS da página)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  gclid TEXT,
  fbc TEXT,
  fbp TEXT,
  
  -- Contexto
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  
  -- Vinculação (preenchido após match com CRM)
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  attribution_id UUID REFERENCES public.lead_attribution(id) ON DELETE SET NULL,
  
  -- Status de processamento
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Views das páginas (analytics básico)
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  
  -- Session tracking
  session_id TEXT,
  
  -- UTMs
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  fbclid TEXT,
  gclid TEXT,
  
  -- Contexto
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_type ON public.pages(type);

CREATE INDEX IF NOT EXISTS idx_page_conversions_page ON public.page_conversions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_conversions_created ON public.page_conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_conversions_campaign ON public.page_conversions(utm_campaign);

CREATE INDEX IF NOT EXISTS idx_page_views_page ON public.page_views(page_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views(created_at DESC);

-- RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pages"
ON public.pages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage pages"
ON public.pages FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can view conversions"
ON public.page_conversions FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert conversions"
ON public.page_conversions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can view page_views"
ON public.page_views FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert page_views"
ON public.page_views FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FUNCTION: Incrementar contadores de página
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_page_views(page_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.pages
  SET views_count = views_count + 1
  WHERE slug = page_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_page_conversions(page_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.pages
  SET conversions_count = conversions_count + 1
  WHERE slug = page_slug;
END;
$$;

-- ============================================================================
-- FUNCTION: Match lead_attribution com crm_lead
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_attribution_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matched_attribution_id UUID;
BEGIN
  -- Tentar match por email primeiro, depois por telefone
  SELECT id INTO matched_attribution_id
  FROM public.lead_attribution
  WHERE 
    (email IS NOT NULL AND email = NEW.email)
    OR (phone IS NOT NULL AND phone = NEW.telefone)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se encontrou, vincular
  IF matched_attribution_id IS NOT NULL THEN
    UPDATE public.lead_attribution
    SET lead_id = NEW.id
    WHERE id = matched_attribution_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para auto-match quando lead é criado
DROP TRIGGER IF EXISTS trigger_match_attribution_on_lead_create ON public.crm_leads;
CREATE TRIGGER trigger_match_attribution_on_lead_create
AFTER INSERT ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.match_attribution_to_lead();
