-- Adicionar coluna para meta de reunioes realizadas
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
USING (true);