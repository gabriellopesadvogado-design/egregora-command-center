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
  WITH CHECK (public.is_admin_or_manager(auth.uid()) OR user_id = auth.uid());