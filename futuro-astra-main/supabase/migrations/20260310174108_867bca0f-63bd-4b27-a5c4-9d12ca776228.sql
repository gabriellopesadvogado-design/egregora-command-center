
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
