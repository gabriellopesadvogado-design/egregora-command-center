-- 1. Criar enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'sdr', 'closer');
CREATE TYPE public.plataforma_origem AS ENUM ('google', 'meta', 'outros');
CREATE TYPE public.meeting_status AS ENUM ('agendada', 'aconteceu', 'no_show', 'cancelada');
CREATE TYPE public.avaliacao_reuniao AS ENUM ('boa', 'neutra', 'ruim');
CREATE TYPE public.proposal_status AS ENUM ('aberta', 'follow_up', 'ganha', 'perdida');
CREATE TYPE public.notification_tipo AS ENUM ('lembrete_sdr', 'lembrete_closer_5min', 'lembrete_closer_agora');

-- 2. Tabela profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'sdr',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela user_roles (para RLS seguro)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. Tabela leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  plataforma_origem plataforma_origem NOT NULL DEFAULT 'outros',
  sdr_id UUID NOT NULL REFERENCES public.profiles(id),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela meetings
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES public.profiles(id),
  closer_id UUID NOT NULL REFERENCES public.profiles(id),
  inicio_em TIMESTAMP WITH TIME ZONE NOT NULL,
  status meeting_status NOT NULL DEFAULT 'agendada',
  observacao TEXT,
  avaliacao_reuniao avaliacao_reuniao,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela proposals
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  closer_id UUID NOT NULL REFERENCES public.profiles(id),
  status proposal_status NOT NULL DEFAULT 'aberta',
  valor_proposto DECIMAL(12,2),
  valor_fechado DECIMAL(12,2),
  caixa_gerado DECIMAL(12,2),
  fechado_em TIMESTAMP WITH TIME ZONE,
  motivo_perda TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabela weekly_targets
CREATE TABLE public.weekly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio DATE NOT NULL,
  semana_fim DATE NOT NULL,
  meta_fechamentos_qtd INTEGER NOT NULL,
  meta_fechamentos_valor DECIMAL(12,2),
  criado_por UUID NOT NULL REFERENCES public.profiles(id),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Tabela notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  tipo notification_tipo NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  enviado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Índices
CREATE INDEX idx_meetings_inicio_em ON public.meetings(inicio_em);
CREATE INDEX idx_meetings_closer_inicio ON public.meetings(closer_id, inicio_em);
CREATE INDEX idx_meetings_sdr_inicio ON public.meetings(sdr_id, inicio_em);
CREATE INDEX idx_proposals_closer_status ON public.proposals(closer_id, status);
CREATE INDEX idx_proposals_fechado_em ON public.proposals(fechado_em);
CREATE INDEX idx_leads_sdr_id ON public.leads(sdr_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- 10. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 11. Função security definer para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 12. Função para verificar se é admin ou manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

-- 13. Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 14. Trigger para criar profile e user_role automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), 'sdr');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sdr');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. RLS Policies para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin/Manager can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin/Manager can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- 16. RLS Policies para user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 17. RLS Policies para leads
CREATE POLICY "SDR can view own leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (sdr_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "SDR can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (sdr_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "SDR can update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (sdr_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- 18. RLS Policies para meetings
CREATE POLICY "View own meetings"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (
    sdr_id = auth.uid() OR 
    closer_id = auth.uid() OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Insert meetings"
  ON public.meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    sdr_id = auth.uid() OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Update own meetings"
  ON public.meetings FOR UPDATE
  TO authenticated
  USING (
    sdr_id = auth.uid() OR 
    closer_id = auth.uid() OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Delete meetings"
  ON public.meetings FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- 19. RLS Policies para proposals
CREATE POLICY "Closer can view own proposals"
  ON public.proposals FOR SELECT
  TO authenticated
  USING (closer_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Closer can insert proposals"
  ON public.proposals FOR INSERT
  TO authenticated
  WITH CHECK (closer_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Closer can update own proposals"
  ON public.proposals FOR UPDATE
  TO authenticated
  USING (closer_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can delete proposals"
  ON public.proposals FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- 20. RLS Policies para weekly_targets
CREATE POLICY "Everyone can view targets"
  ON public.weekly_targets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/Manager can manage targets"
  ON public.weekly_targets FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- 21. RLS Policies para notifications
CREATE POLICY "User can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()) OR user_id = auth.uid());-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_lida ON public.notifications(user_id, lida);
CREATE INDEX IF NOT EXISTS idx_notifications_meeting_tipo ON public.notifications(meeting_id, tipo);
CREATE INDEX IF NOT EXISTS idx_proposals_fechado_em ON public.proposals(fechado_em);
CREATE INDEX IF NOT EXISTS idx_meetings_inicio_em_status ON public.meetings(inicio_em, status);-- Adiciona campo para nome do lead inline (sem precisar tabela leads)
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS nome_lead TEXT;

-- Torna lead_id opcional para reuniões simples
ALTER TABLE public.meetings 
ALTER COLUMN lead_id DROP NOT NULL;-- Adicionar novos valores ao enum plataforma_origem
ALTER TYPE public.plataforma_origem ADD VALUE IF NOT EXISTS 'blog';
ALTER TYPE public.plataforma_origem ADD VALUE IF NOT EXISTS 'organico';
ALTER TYPE public.plataforma_origem ADD VALUE IF NOT EXISTS 'indicacao';

-- Adicionar coluna fonte_lead na tabela meetings
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS fonte_lead public.plataforma_origem DEFAULT 'outros';-- Adicionar novo status ao enum meeting_status
ALTER TYPE meeting_status ADD VALUE 'proposta_enviada' AFTER 'aconteceu';-- Adicionar novos status ao enum meeting_status
ALTER TYPE meeting_status ADD VALUE 'ganha' AFTER 'proposta_enviada';
ALTER TYPE meeting_status ADD VALUE 'perdida' AFTER 'ganha';

-- Adicionar campos financeiros na tabela meetings
ALTER TABLE meetings ADD COLUMN valor_fechado NUMERIC;
ALTER TABLE meetings ADD COLUMN caixa_gerado NUMERIC;
ALTER TABLE meetings ADD COLUMN motivo_perda TEXT;
ALTER TABLE meetings ADD COLUMN fechado_em TIMESTAMPTZ;-- Adicionar coluna para meta de reunioes realizadas
ALTER TABLE weekly_targets 
ADD COLUMN meta_reunioes_realizadas integer DEFAULT 0;

-- Criar tabela para metas mensais
CREATE TABLE monthly_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_ano date NOT NULL,
  meta_faturamento numeric NOT NULL,
  criado_por uuid REFERENCES profiles(id) NOT NULL,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(mes_ano)
);

-- Habilitar RLS
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
CREATE POLICY "Admin/Manager can manage monthly targets"
ON monthly_targets FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Everyone can view monthly targets"
ON monthly_targets FOR SELECT
USING (true);-- Adicionar constraint UNIQUE para permitir upsert por semana
ALTER TABLE weekly_targets 
ADD CONSTRAINT weekly_targets_semana_unique 
UNIQUE (semana_inicio, semana_fim);-- Criar tabela para metas anuais
CREATE TABLE public.yearly_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL UNIQUE,
  meta_faturamento NUMERIC NOT NULL,
  criado_por UUID NOT NULL REFERENCES public.profiles(id),
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.yearly_targets ENABLE ROW LEVEL SECURITY;

-- Policy para Admin/Manager gerenciar metas anuais
CREATE POLICY "Admin/Manager can manage yearly targets"
  ON public.yearly_targets
  FOR ALL
  USING (is_admin_or_manager(auth.uid()));

-- Policy para todos visualizarem metas anuais
CREATE POLICY "Everyone can view yearly targets"
  ON public.yearly_targets
  FOR SELECT
  USING (true);-- Criar bucket para assets da plataforma
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- Política: Qualquer um pode visualizar assets
CREATE POLICY "Public read access for assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Política: Admin/Manager pode fazer upload de assets
CREATE POLICY "Admin can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets' AND
  public.is_admin_or_manager(auth.uid())
);

-- Política: Admin/Manager pode atualizar assets
CREATE POLICY "Admin can update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assets' AND
  public.is_admin_or_manager(auth.uid())
);

-- Política: Admin/Manager pode deletar assets
CREATE POLICY "Admin can delete assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets' AND
  public.is_admin_or_manager(auth.uid())
);-- =====================================================
-- SECURITY FIX: Block anonymous access to all tables
-- =====================================================

-- 1. Block anonymous access to sensitive tables
CREATE POLICY "Block anonymous access to leads"
ON public.leads FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to meetings"
ON public.meetings FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to proposals"
ON public.proposals FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to profiles"
ON public.profiles FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to notifications"
ON public.notifications FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles FOR ALL
TO anon
USING (false);

-- 2. Fix target tables - remove "everyone" policies
DROP POLICY IF EXISTS "Everyone can view targets" ON public.weekly_targets;
DROP POLICY IF EXISTS "Everyone can view monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Everyone can view yearly targets" ON public.yearly_targets;

-- 3. Create authenticated-only policies for targets
CREATE POLICY "Authenticated can view weekly targets"
ON public.weekly_targets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can view monthly targets"
ON public.monthly_targets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can view yearly targets"
ON public.yearly_targets FOR SELECT
TO authenticated
USING (true);

-- 4. Block anonymous for target tables
CREATE POLICY "Block anonymous for weekly_targets"
ON public.weekly_targets FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous for monthly_targets"
ON public.monthly_targets FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous for yearly_targets"
ON public.yearly_targets FOR ALL
TO anon
USING (false);-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "View own meetings" ON public.meetings;

-- Create new policy allowing all authenticated users to view all meetings
CREATE POLICY "Authenticated users can view all meetings"
ON public.meetings
FOR SELECT
TO authenticated
USING (true);-- Remove restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admin/Manager can view all profiles" ON profiles;

-- Allow all authenticated users to view all profiles (needed for closer selection, rankings, etc.)
CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT TO authenticated
USING (true);ALTER TYPE public.plataforma_origem ADD VALUE 'reativacao';ALTER TABLE public.meetings 
ADD COLUMN valor_proposta numeric;

COMMENT ON COLUMN public.meetings.valor_proposta IS 'Valor da proposta enviada ao lead';-- Criar tabela para histórico de relatórios WBR/IA
CREATE TABLE public.wbr_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('WBR_SEMANAL', 'ANALISE_MENSAL')),
  date_start date NOT NULL,
  date_end date NOT NULL,
  premium_mode boolean NOT NULL DEFAULT false,
  manual_inputs_json jsonb,
  report_context_snapshot jsonb,
  ai_output_json jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wbr_ai_reports ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access to wbr_ai_reports"
ON public.wbr_ai_reports
FOR ALL
TO anon
USING (false);

-- Admin/Manager can view all reports
CREATE POLICY "Admin/Manager can view all reports"
ON public.wbr_ai_reports
FOR SELECT
TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- Users can view own reports
CREATE POLICY "Users can view own reports"
ON public.wbr_ai_reports
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Authenticated users can insert their own reports
CREATE POLICY "Users can insert own reports"
ON public.wbr_ai_reports
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Admin/Manager can delete reports
CREATE POLICY "Admin/Manager can delete reports"
ON public.wbr_ai_reports
FOR DELETE
TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_wbr_ai_reports_created_by ON public.wbr_ai_reports(created_by);
CREATE INDEX idx_wbr_ai_reports_created_at ON public.wbr_ai_reports(created_at DESC);-- Adicionar coluna telefone na tabela meetings (nullable para dados existentes)
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS telefone text;

-- Índice para busca por telefone (chave de integração)
CREATE INDEX IF NOT EXISTS idx_meetings_telefone ON public.meetings (telefone);
CREATE TYPE public.followup_canal AS ENUM ('ligacao', 'whatsapp');
CREATE TYPE public.followup_status AS ENUM ('pendente', 'feito', 'ignorado');

CREATE TABLE public.followup_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  closer_id uuid NOT NULL REFERENCES public.profiles(id),
  canal followup_canal NOT NULL DEFAULT 'whatsapp',
  data_prevista date NOT NULL,
  status followup_status NOT NULL DEFAULT 'pendente',
  notas text,
  executado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.followup_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Closers can view own followups" ON public.followup_steps
  FOR SELECT TO authenticated
  USING (closer_id = auth.uid() OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Closers can insert own followups" ON public.followup_steps
  FOR INSERT TO authenticated
  WITH CHECK (closer_id = auth.uid() OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Closers can update own followups" ON public.followup_steps
  FOR UPDATE TO authenticated
  USING (closer_id = auth.uid() OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can delete followups" ON public.followup_steps
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Block anonymous followup_steps" ON public.followup_steps
  FOR ALL TO anon USING (false);
ALTER TABLE public.meetings ADD COLUMN primeiro_followup_em date;
CREATE OR REPLACE FUNCTION public.get_followup_counts(p_meeting_ids uuid[])
RETURNS TABLE(meeting_id uuid, total_pendentes bigint, atrasados_ou_hoje bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    fs.meeting_id,
    COUNT(*) AS total_pendentes,
    COUNT(*) FILTER (WHERE fs.data_prevista <= CURRENT_DATE) AS atrasados_ou_hoje
  FROM followup_steps fs
  WHERE fs.meeting_id = ANY(p_meeting_ids)
    AND fs.status = 'pendente'
  GROUP BY fs.meeting_id
$$;

ALTER TABLE public.followup_steps ADD COLUMN IF NOT EXISTS codigo text;

ALTER TABLE public.followup_steps
  ADD CONSTRAINT followup_steps_meeting_codigo_unique UNIQUE (meeting_id, codigo);

-- Drop existing RESTRICTIVE policies on followup_steps
DROP POLICY IF EXISTS "Closers can view own followups" ON followup_steps;
DROP POLICY IF EXISTS "Closers can insert own followups" ON followup_steps;
DROP POLICY IF EXISTS "Closers can update own followups" ON followup_steps;
DROP POLICY IF EXISTS "Admin/Manager can delete followups" ON followup_steps;
DROP POLICY IF EXISTS "Block anonymous followup_steps" ON followup_steps;

-- Recreate as PERMISSIVE with proper command separation

-- SELECT: closer sees own, admin/manager sees all
CREATE POLICY "Closers can view own followups" ON followup_steps
  FOR SELECT TO authenticated USING (closer_id = auth.uid());

CREATE POLICY "Admins can view all followups" ON followup_steps
  FOR SELECT TO authenticated USING (is_admin_or_manager(auth.uid()));

-- INSERT: closer inserts own, admin/manager inserts any
CREATE POLICY "Closers can insert own followups" ON followup_steps
  FOR INSERT TO authenticated WITH CHECK (closer_id = auth.uid());

CREATE POLICY "Admins can insert followups" ON followup_steps
  FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager(auth.uid()));

-- UPDATE: closer updates own, admin/manager updates any
CREATE POLICY "Closers can update own followups" ON followup_steps
  FOR UPDATE TO authenticated
  USING (closer_id = auth.uid()) WITH CHECK (closer_id = auth.uid());

CREATE POLICY "Admins can update all followups" ON followup_steps
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- DELETE: admin/manager only
CREATE POLICY "Admins can delete followups" ON followup_steps
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- Block anon access
CREATE POLICY "Block anonymous followup_steps" ON followup_steps
  AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP FUNCTION IF EXISTS public.get_followup_counts(uuid[]);

CREATE OR REPLACE FUNCTION public.get_followup_counts(p_meeting_ids uuid[])
 RETURNS TABLE(meeting_id uuid, total_pendentes bigint, atrasados bigint, hoje bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    fs.meeting_id,
    COUNT(*) AS total_pendentes,
    COUNT(*) FILTER (WHERE fs.data_prevista < CURRENT_DATE) AS atrasados,
    COUNT(*) FILTER (WHERE fs.data_prevista = CURRENT_DATE) AS hoje
  FROM followup_steps fs
  WHERE fs.meeting_id = ANY(p_meeting_ids)
    AND fs.status = 'pendente'
  GROUP BY fs.meeting_id
$function$;
-- Table
CREATE TABLE public.channel_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal plataforma_origem NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  investimento numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(canal, periodo_inicio, periodo_fim)
);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_channel_costs_period()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.periodo_fim < NEW.periodo_inicio THEN
    RAISE EXCEPTION 'periodo_fim must be >= periodo_inicio';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_channel_costs_period
  BEFORE INSERT OR UPDATE ON public.channel_costs
  FOR EACH ROW EXECUTE FUNCTION public.validate_channel_costs_period();

-- RLS
ALTER TABLE public.channel_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous channel_costs" ON public.channel_costs
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Admin/Manager full access" ON public.channel_costs
  FOR ALL TO authenticated
  USING (is_admin_or_manager(auth.uid()))
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- RPC
CREATE OR REPLACE FUNCTION public.roi_por_canal(p_inicio date, p_fim date)
RETURNS TABLE(
  canal plataforma_origem,
  investimento numeric,
  receita numeric,
  deals_ganhos bigint,
  roas numeric,
  roi numeric,
  cac_aprox numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH costs AS (
    SELECT cc.canal, COALESCE(SUM(cc.investimento), 0) AS investimento
    FROM channel_costs cc
    WHERE cc.periodo_inicio >= p_inicio AND cc.periodo_fim <= p_fim
    GROUP BY cc.canal
  ),
  revenue AS (
    SELECT m.fonte_lead AS canal,
      COALESCE(SUM(m.valor_fechado), 0) AS receita,
      COUNT(*) AS deals_ganhos
    FROM meetings m
    WHERE m.status = 'ganha' AND m.inicio_em::date BETWEEN p_inicio AND p_fim
    GROUP BY m.fonte_lead
  )
  SELECT
    COALESCE(c.canal, r.canal) AS canal,
    COALESCE(c.investimento, 0) AS investimento,
    COALESCE(r.receita, 0) AS receita,
    COALESCE(r.deals_ganhos, 0) AS deals_ganhos,
    CASE WHEN COALESCE(c.investimento, 0) = 0 THEN NULL
      ELSE COALESCE(r.receita, 0) / c.investimento END AS roas,
    CASE WHEN COALESCE(c.investimento, 0) = 0 THEN NULL
      ELSE (COALESCE(r.receita, 0) - c.investimento) / c.investimento END AS roi,
    CASE WHEN COALESCE(r.deals_ganhos, 0) = 0 THEN NULL
      ELSE COALESCE(c.investimento, 0) / r.deals_ganhos END AS cac_aprox
  FROM costs c FULL OUTER JOIN revenue r ON c.canal = r.canal
$$;

ALTER FUNCTION public.validate_channel_costs_period() SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.followup_compliance_by_closer(
  p_start date,
  p_end date,
  p_include_ignored boolean DEFAULT false
)
RETURNS TABLE(
  closer_id uuid,
  closer_nome text,
  due_total bigint,
  done_total bigint,
  overdue_total bigint,
  compliance numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    fs.closer_id,
    p.nome AS closer_nome,
    COUNT(*) FILTER (
      WHERE fs.status IN ('pendente', 'feito')
        OR (p_include_ignored AND fs.status = 'ignorado')
    ) AS due_total,
    COUNT(*) FILTER (WHERE fs.status = 'feito') AS done_total,
    COUNT(*) FILTER (WHERE fs.status = 'pendente' AND fs.data_prevista < CURRENT_DATE) AS overdue_total,
    ROUND(
      COUNT(*) FILTER (WHERE fs.status = 'feito')::numeric
      / NULLIF(
          COUNT(*) FILTER (
            WHERE fs.status IN ('pendente', 'feito')
              OR (p_include_ignored AND fs.status = 'ignorado')
          ), 0
        ),
      4
    ) AS compliance
  FROM followup_steps fs
  JOIN profiles p ON p.id = fs.closer_id
  WHERE fs.data_prevista BETWEEN p_start AND CURRENT_DATE
    AND fs.data_prevista <= p_end
  GROUP BY fs.closer_id, p.nome
  ORDER BY compliance DESC NULLS LAST, overdue_total ASC
$$;

CREATE OR REPLACE FUNCTION public.close_followups_on_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'perdida' AND OLD.status IS DISTINCT FROM 'perdida' THEN
    UPDATE followup_steps
    SET status = 'ignorado',
        notas = 'Deal marcado como perdida em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
    WHERE meeting_id = NEW.id AND status = 'pendente';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_close_followups_on_loss
AFTER UPDATE OF status ON meetings
FOR EACH ROW
WHEN (NEW.status = 'perdida' AND OLD.status IS DISTINCT FROM 'perdida')
EXECUTE FUNCTION close_followups_on_loss();
CREATE OR REPLACE FUNCTION public.close_followups_on_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('perdida', 'ganha') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE followup_steps
    SET status = 'ignorado',
        notas = CASE
          WHEN NEW.status = 'ganha' THEN 'Deal ganho em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
          ELSE 'Deal marcado como perdida em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
        END
    WHERE meeting_id = NEW.id AND status = 'pendente';
  END IF;
  RETURN NEW;
END;
$$;
-- Add perda_tipo column to meetings
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS perda_tipo text;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_perda_tipo_check 
  CHECK (perda_tipo IS NULL OR perda_tipo IN ('simples', 'definitiva'));
CREATE INDEX IF NOT EXISTS idx_meetings_status_perda_tipo ON public.meetings (status, perda_tipo);

-- Update trigger to handle perda_tipo logic
CREATE OR REPLACE FUNCTION public.close_followups_on_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'ganha' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE followup_steps
    SET status = 'ignorado',
        notas = 'Deal ganho em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
    WHERE meeting_id = NEW.id AND status = 'pendente';
  ELSIF NEW.status = 'perdida' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.perda_tipo = 'simples' THEN
      UPDATE followup_steps
      SET status = 'ignorado',
          notas = 'Perdido simples — encerrada cadência inicial; manter mensal.'
      WHERE meeting_id = NEW.id AND status = 'pendente'
        AND (codigo IS NULL OR codigo NOT LIKE 'MEN%');
    ELSE
      UPDATE followup_steps
      SET status = 'ignorado',
          notas = 'Deal marcado como perdida em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
      WHERE meeting_id = NEW.id AND status = 'pendente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_close_followups_on_loss ON public.meetings;
CREATE TRIGGER trg_close_followups_on_loss
  AFTER UPDATE OF status ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.close_followups_on_loss();

ALTER TABLE public.followup_steps ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'padrao';
ALTER TABLE public.followup_steps ADD COLUMN IF NOT EXISTS manual_titulo text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'followup_steps_tipo_check') THEN
    ALTER TABLE public.followup_steps ADD CONSTRAINT followup_steps_tipo_check CHECK (tipo IN ('padrao', 'manual'));
  END IF;
END $$;

-- Drop old unique constraint/index on (meeting_id, codigo) and recreate as partial
ALTER TABLE public.followup_steps DROP CONSTRAINT IF EXISTS followup_steps_meeting_id_codigo_key;
DROP INDEX IF EXISTS followup_steps_meeting_id_codigo_key;

-- Create partial unique index only for tipo='padrao'
CREATE UNIQUE INDEX IF NOT EXISTS followup_steps_meeting_id_codigo_padrao_key 
  ON public.followup_steps (meeting_id, codigo) WHERE tipo = 'padrao';
INSERT INTO storage.buckets (id, name, public) VALUES ('proposal_templates', 'proposal_templates', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for proposal_templates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'proposal_templates');

CREATE POLICY "Authenticated upload to proposal_templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposal_templates');-- 1. Bucket privado para PDFs gerados
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_pdfs', 'proposal_pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela proposal_documents
CREATE TABLE public.proposal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid,
  lead_id uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  file_size integer,
  validity_date date,
  payment_mode text,
  payment_text text,
  total_original numeric,
  total_final numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_documents_proposal_id ON public.proposal_documents(proposal_id);
CREATE INDEX idx_proposal_documents_lead_id ON public.proposal_documents(lead_id);
CREATE INDEX idx_proposal_documents_created_by ON public.proposal_documents(created_by);

ALTER TABLE public.proposal_documents ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies na tabela
CREATE POLICY "Admin/Manager can view all documents"
ON public.proposal_documents FOR SELECT TO authenticated
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view own documents"
ON public.proposal_documents FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Authenticated can insert documents"
ON public.proposal_documents FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin/Manager can update documents"
ON public.proposal_documents FOR UPDATE TO authenticated
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can delete documents"
ON public.proposal_documents FOR DELETE TO authenticated
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Block anonymous proposal_documents"
ON public.proposal_documents FOR ALL TO anon
USING (false);

-- 4. Storage policies para proposal_pdfs
CREATE POLICY "Users can read own PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proposal_pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'proposal_pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'proposal_pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admin can read all PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proposal_pdfs' AND is_admin_or_manager(auth.uid()));-- 1. Security definer function (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.core_users
    WHERE id = _user_id AND cargo = 'admin'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- 2. Fix core_users policy
DROP POLICY IF EXISTS "Users can read own data" ON public.core_users;
CREATE POLICY "Users can read own data or admin reads all"
ON public.core_users FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- 3. Fix crm_meetings recursive policy
DROP POLICY IF EXISTS "Meetings by role" ON public.crm_meetings;
CREATE POLICY "Meetings by role"
ON public.crm_meetings FOR ALL TO authenticated
USING (closer_id = auth.uid() OR sdr_id = auth.uid() OR public.is_admin(auth.uid()));

-- 4. Fix crm_followup_steps recursive policy
DROP POLICY IF EXISTS "Followups by role" ON public.crm_followup_steps;
CREATE POLICY "Followups by role"
ON public.crm_followup_steps FOR ALL TO authenticated
USING (responsavel_id = auth.uid() OR public.is_admin(auth.uid()));CREATE POLICY "Authenticated can insert leads"
ON public.crm_leads FOR INSERT TO authenticated
WITH CHECK (true);-- Helper function to check if user is admin or gestor
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.core_users
    WHERE id = _user_id AND cargo IN ('admin', 'gestor')
  )
$$;

-- Update meetings RLS policy to include gestores
DROP POLICY IF EXISTS "Meetings by role" ON public.crm_meetings;
CREATE POLICY "Meetings by role" ON public.crm_meetings
FOR ALL TO authenticated
USING (closer_id = auth.uid() OR sdr_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
WITH CHECK (closer_id = auth.uid() OR sdr_id = auth.uid() OR is_admin_or_gestor(auth.uid()));CREATE TABLE public.crm_notas (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.crm_meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'nota',
  sincronizado_hubspot boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read notes" ON public.crm_notas
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert notes" ON public.crm_notas
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());-- Motivos de perda com regras de reativação
CREATE TABLE public.crm_motivos_perda (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  motivo text NOT NULL UNIQUE,
  reativavel boolean NOT NULL DEFAULT true,
  dias_minimos_reativacao integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_motivos_perda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read motivos" ON public.crm_motivos_perda FOR SELECT TO authenticated USING (true);

-- Seed dos 11 motivos
INSERT INTO public.crm_motivos_perda (motivo, reativavel, dias_minimos_reativacao) VALUES
  ('Não possui orçamento', true, 60),
  ('Não respondeu proposta', true, 30),
  ('Não assinou contrato', true, 30),
  ('Fechou com corrente', true, 90),
  ('Não consegui contato', true, 30),
  ('Não tem requisitos mínimos', false, 0),
  ('Não quis continuar com o processo', true, 60),
  ('Desqualificado (busca visto para outro país)', false, 0),
  ('Brasileiro', false, 0),
  ('Tem pedido de refúgio', false, 0),
  ('Outro', true, 90);

-- Reativações
CREATE TABLE public.crm_reativacoes (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.crm_meetings(id) ON DELETE CASCADE,
  motivo_perda_original text NOT NULL,
  data_perda timestamptz NOT NULL,
  data_reativacao timestamptz DEFAULT now(),
  faixa_reativacao text NOT NULL,
  responsavel_reativacao_id uuid NOT NULL,
  notas_reativacao text,
  resultado text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_reativacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read reativacoes" ON public.crm_reativacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert reativacoes" ON public.crm_reativacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update reativacoes" ON public.crm_reativacoes
  FOR UPDATE TO authenticated USING (is_admin_or_gestor(auth.uid()) OR responsavel_reativacao_id = auth.uid());ALTER TABLE public.crm_meetings ADD COLUMN avaliacao_reuniao text;-- Tabela para contas de anúncios (Meta Ads e Google Ads)
CREATE TABLE IF NOT EXISTS public.ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  account_id TEXT NOT NULL,
  account_name TEXT,
  currency TEXT DEFAULT 'BRL',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  access_token_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, platform, account_id)
);

-- Habilitar RLS
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own ad accounts"
ON public.ad_accounts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ad accounts"
ON public.ad_accounts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ad accounts"
ON public.ad_accounts FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ad accounts"
ON public.ad_accounts FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_ad_accounts_updated_at
BEFORE UPDATE ON public.ad_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_ad_accounts_user_platform ON public.ad_accounts(user_id, platform);
CREATE INDEX idx_ad_accounts_active ON public.ad_accounts(is_active) WHERE is_active = true;
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
