
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
