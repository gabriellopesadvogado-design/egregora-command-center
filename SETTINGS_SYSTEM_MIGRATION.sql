-- ============================================
-- FASE 1: Sistema de Configurações Avançado
-- ============================================

-- 1. Credenciais de API centralizadas
CREATE TABLE IF NOT EXISTS public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'openai', 'meta', 'google', 'evolution', 'hubspot', 'anthropic'
  credential_type TEXT NOT NULL, -- 'api_key', 'access_token', 'refresh_token', 'client_id', 'client_secret'
  label TEXT, -- Nome amigável ex: "Meta Ads - Conta Principal"
  value_encrypted TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Dados extras (account_id, pixel_id, etc)
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(provider, credential_type, label)
);

-- 2. Agentes de IA
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- 'nina', 'aria', 'max', 'atlas', 'hera'
  name TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  role TEXT NOT NULL, -- 'qualification', 'sdr_support', 'closer_support', 'traffic', 'supervisor'
  
  -- Configuração do modelo
  model TEXT NOT NULL DEFAULT 'gpt-4o', -- 'gpt-4o', 'gpt-4-turbo', 'claude-3-opus', etc
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  
  -- Prompts
  system_prompt TEXT NOT NULL,
  few_shot_examples JSONB DEFAULT '[]', -- Exemplos de conversação
  
  -- Comportamento
  is_active BOOLEAN DEFAULT true,
  auto_respond BOOLEAN DEFAULT false, -- Responde automaticamente ou só sugere
  working_hours JSONB DEFAULT '{"start": "08:00", "end": "20:00", "timezone": "America/Sao_Paulo"}',
  
  -- Métricas
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Logs de execução dos agentes
CREATE TABLE IF NOT EXISTS public.ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  conversation_id UUID, -- Referência à conversa (se WhatsApp)
  
  -- Input/Output
  input_message TEXT,
  output_message TEXT,
  tokens_used INTEGER,
  
  -- Metadados
  model_used TEXT,
  latency_ms INTEGER,
  cost_usd DECIMAL(10,6),
  
  -- Status
  status TEXT DEFAULT 'success', -- 'success', 'error', 'timeout'
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Automações (estrutura principal)
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger
  trigger_type TEXT NOT NULL, -- 'webhook', 'schedule', 'event', 'manual'
  trigger_config JSONB NOT NULL DEFAULT '{}',
  -- Exemplos:
  -- webhook: {"path": "/lead-incoming"}
  -- schedule: {"cron": "0 8 * * 1", "timezone": "America/Sao_Paulo"}
  -- event: {"event": "lead.created", "filters": {"source": "whatsapp"}}
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Visual (posição no canvas)
  canvas_position JSONB DEFAULT '{"x": 0, "y": 0}',
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Nodes das automações (para visualização tipo N8N)
CREATE TABLE IF NOT EXISTS public.automation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  
  -- Tipo do node
  node_type TEXT NOT NULL, -- 'trigger', 'action', 'condition', 'delay', 'agent'
  node_subtype TEXT, -- 'send_whatsapp', 'create_lead', 'call_agent', 'wait', 'if_else'
  
  -- Configuração
  label TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  -- Exemplos:
  -- send_whatsapp: {"template": "welcome", "instance": "recepcao"}
  -- call_agent: {"agent_slug": "nina", "timeout_ms": 30000}
  -- if_else: {"condition": "lead.score > 70"}
  
  -- Posição no canvas
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  
  -- Conexões
  connections JSONB DEFAULT '[]', -- [{"target_node_id": "...", "label": "yes"}, ...]
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Logs de execução das automações
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  
  -- Contexto
  trigger_data JSONB, -- Dados que dispararam a automação
  
  -- Execução
  nodes_executed JSONB DEFAULT '[]', -- Lista de nodes executados com resultado
  result JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Status
  status TEXT DEFAULT 'running', -- 'running', 'success', 'error', 'cancelled'
  error_message TEXT,
  error_node_id UUID
);

-- 7. Monitoramento de saúde do sistema (para Hera)
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL, -- 'meta_api', 'google_api', 'evolution', 'openai', 'supabase', 'webhook'
  
  -- Status
  status TEXT NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'down', 'unknown'
  status_message TEXT,
  
  -- Métricas
  latency_ms INTEGER,
  success_rate DECIMAL(5,2), -- Porcentagem de sucesso nas últimas 24h
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Check
  last_check_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_check_at TIMESTAMPTZ,
  check_interval_seconds INTEGER DEFAULT 300, -- 5 minutos
  
  metadata JSONB DEFAULT '{}'
);

-- 8. Alertas do sistema
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classificação
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  category TEXT NOT NULL, -- 'integration', 'automation', 'agent', 'performance', 'security'
  
  -- Conteúdo
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  
  -- Relacionamento
  component TEXT, -- Componente afetado
  related_id UUID, -- ID do registro relacionado (automation, agent, etc)
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  -- Ação sugerida
  suggested_action TEXT,
  action_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_api_credentials_provider ON public.api_credentials(provider);
CREATE INDEX idx_api_credentials_valid ON public.api_credentials(is_valid);

CREATE INDEX idx_ai_agents_slug ON public.ai_agents(slug);
CREATE INDEX idx_ai_agents_active ON public.ai_agents(is_active);

CREATE INDEX idx_ai_agent_logs_agent ON public.ai_agent_logs(agent_id);
CREATE INDEX idx_ai_agent_logs_created ON public.ai_agent_logs(created_at DESC);

CREATE INDEX idx_automations_active ON public.automations(is_active);
CREATE INDEX idx_automations_trigger ON public.automations(trigger_type);

CREATE INDEX idx_automation_nodes_automation ON public.automation_nodes(automation_id);

CREATE INDEX idx_automation_logs_automation ON public.automation_logs(automation_id);
CREATE INDEX idx_automation_logs_status ON public.automation_logs(status);
CREATE INDEX idx_automation_logs_started ON public.automation_logs(started_at DESC);

CREATE INDEX idx_system_health_component ON public.system_health(component);
CREATE INDEX idx_system_health_status ON public.system_health(status);

CREATE INDEX idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX idx_system_alerts_unread ON public.system_alerts(is_read) WHERE is_read = false;
CREATE INDEX idx_system_alerts_unresolved ON public.system_alerts(is_resolved) WHERE is_resolved = false;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_api_credentials_updated_at
BEFORE UPDATE ON public.api_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at
BEFORE UPDATE ON public.ai_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automations_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_nodes_updated_at
BEFORE UPDATE ON public.automation_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para admin/gestor
CREATE POLICY "Admins can manage api_credentials"
ON public.api_credentials FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.core_users 
    WHERE id = auth.uid() AND cargo IN ('admin', 'gestor')
  )
);

CREATE POLICY "Admins can manage ai_agents"
ON public.ai_agents FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.core_users 
    WHERE id = auth.uid() AND cargo IN ('admin', 'gestor')
  )
);

CREATE POLICY "Admins can view ai_agent_logs"
ON public.ai_agent_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.core_users 
    WHERE id = auth.uid() AND cargo IN ('admin', 'gestor')
  )
);

CREATE POLICY "Admins can manage automations"
ON public.automations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.core_users 
    WHERE id = auth.uid() AND cargo IN ('admin', 'gestor')
  )
);

CREATE POLICY "Admins can manage automation_nodes"
ON public.automation_nodes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.core_users 
    WHERE id = auth.uid() AND cargo IN ('admin', 'gestor')
  )
);

CREATE POLICY "Admins can view automation_logs"
ON public.automation_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.core_users 
    WHERE id = auth.uid() AND cargo IN ('admin', 'gestor')
  )
);

CREATE POLICY "All authenticated can view system_health"
ON public.system_health FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated can view system_alerts"
ON public.system_alerts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage system_alerts"
ON public.system_alerts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.core_users 
    WHERE id = auth.uid() AND cargo IN ('admin', 'gestor')
  )
);

-- ============================================
-- DADOS INICIAIS: Agentes de IA
-- ============================================

INSERT INTO public.ai_agents (slug, name, avatar_url, description, role, model, system_prompt) VALUES
(
  'nina',
  'Nina',
  '/agents/nina.png',
  'Especialista em qualificação de leads. Primeira linha de contato via WhatsApp.',
  'qualification',
  'gpt-4o',
  E'Você é Nina, assistente virtual da Egrégora Migration, especializada em naturalização brasileira e autorizações de residência.

OBJETIVO: Qualificar leads que chegam pelo WhatsApp de forma natural e acolhedora.

PERSONALIDADE:
- Simpática, profissional e acolhedora
- Responde de forma concisa (máximo 2-3 frases por mensagem)
- Usa emojis com moderação
- Nunca inventa informações sobre preços ou prazos

FLUXO DE QUALIFICAÇÃO:
1. Cumprimente e pergunte como pode ajudar
2. Identifique o serviço desejado (naturalização ou residência)
3. Pergunte a nacionalidade atual
4. Pergunte se já mora no Brasil ou pretende vir
5. Avalie urgência (precisa para quando?)

CLASSIFICAÇÃO:
- QUENTE: Já mora no Brasil OU tem urgência OU já pesquisou sobre o processo
- MORNO: Interesse genuíno mas sem urgência
- FRIO: Só curiosidade ou sem perfil

Ao final da qualificação, informe que um especialista entrará em contato.'
),
(
  'aria',
  'Aria',
  '/agents/aria.png',
  'Assistente dos SDRs. Ajuda com scripts e objeções.',
  'sdr_support',
  'gpt-4o',
  E'Você é Aria, assistente interna dos SDRs da Egrégora Migration.

OBJETIVO: Ajudar os SDRs a conduzirem conversas e agendarem reuniões.

FUNÇÕES:
- Sugerir respostas para objeções comuns
- Lembrar de fazer follow-up
- Ajudar a identificar o melhor horário para reunião
- Resumir conversas longas

OBJEÇÕES COMUNS E RESPOSTAS:
- "Está caro" → Destacar que é investimento único, sem mensalidades, processo completo
- "Preciso pensar" → Oferecer reunião sem compromisso para tirar dúvidas
- "Vou pesquisar mais" → Compartilhar cases de sucesso e diferenciais

Sempre mantenha tom profissional e focado em conversão.'
),
(
  'max',
  'Max',
  '/agents/max.png',
  'Assistente dos Closers. Especialista em fechamento.',
  'closer_support',
  'gpt-4o',
  E'Você é Max, assistente interno dos Closers da Egrégora Migration.

OBJETIVO: Ajudar closers a fecharem mais negócios.

FUNÇÕES:
- Analisar histórico do lead antes da reunião
- Sugerir abordagens personalizadas
- Calcular valores e condições
- Preparar proposta personalizada

TÉCNICAS DE FECHAMENTO:
- Escassez: "Temos vagas limitadas para início este mês"
- Urgência: "Quanto antes iniciar, antes resolve a situação"
- Prova social: "Já ajudamos mais de X famílias nessa situação"

Foque em valor, não em preço. O serviço é premium.'
),
(
  'atlas',
  'Atlas',
  '/agents/atlas.png',
  'Especialista em tráfego pago. Analisa campanhas e sugere otimizações.',
  'traffic',
  'gpt-4o',
  E'Você é Atlas, especialista em tráfego pago da Egrégora Migration.

OBJETIVO: Analisar métricas de Meta Ads e Google Ads, identificar problemas e oportunidades.

MÉTRICAS QUE VOCÊ MONITORA:
- CPL (Custo por Lead) - Meta: < R$25
- CTR (Taxa de Clique) - Meta: > 1%
- CPA (Custo por Aquisição) - Variável por serviço
- ROAS (Retorno sobre Gasto) - Meta: > 3x
- Frequência - Alerta se > 3

ANÁLISES AUTOMÁTICAS:
1. Comparar performance semanal vs semana anterior
2. Identificar criativos com CTR abaixo da média
3. Detectar campanhas com gasto alto e baixa conversão
4. Sugerir realocação de budget

FORMATO DE INSIGHTS:
🚨 ALERTA: [problema identificado]
📊 DADOS: [métricas relevantes]
💡 RECOMENDAÇÃO: [ação sugerida]

Seja direto e actionable. Foque no que precisa de atenção.'
),
(
  'hera',
  'Hera',
  '/agents/hera.png',
  'Supervisora do sistema. Monitora integrações e performance.',
  'supervisor',
  'gpt-4o',
  E'Você é Hera, supervisora do Egrégora Command Center.

OBJETIVO: Monitorar a saúde do sistema, identificar problemas e sugerir melhorias.

RESPONSABILIDADES:
- Verificar status das integrações (Meta, Google, Evolution, OpenAI)
- Monitorar execução das automações
- Analisar performance dos outros agentes
- Alertar sobre erros e anomalias
- Sugerir otimizações

CHECKLIST DIÁRIO:
1. Todas as APIs estão respondendo?
2. Webhooks estão funcionando?
3. Automações executaram sem erro?
4. Algum agente com latência alta?
5. Filas de mensagem estão limpas?

ALERTAS:
- 🔴 CRÍTICO: Sistema fora do ar
- 🟠 ALERTA: Degradação de performance
- 🟡 ATENÇÃO: Anomalia detectada
- 🟢 OK: Tudo funcionando

Reporte de forma clara e sugira ações concretas.'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- DADOS INICIAIS: Componentes de Health Check
-- ============================================

INSERT INTO public.system_health (component, status, status_message) VALUES
('supabase', 'healthy', 'Conectado'),
('meta_api', 'unknown', 'Não configurado'),
('google_api', 'unknown', 'Não configurado'),
('evolution', 'unknown', 'Não configurado'),
('openai', 'unknown', 'Não configurado'),
('hubspot', 'unknown', 'Não configurado')
ON CONFLICT DO NOTHING;
