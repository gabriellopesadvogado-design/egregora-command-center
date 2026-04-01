-- Tabela para contas de anúncios (Meta Ads e Google Ads)
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
