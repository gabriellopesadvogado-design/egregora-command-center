
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
