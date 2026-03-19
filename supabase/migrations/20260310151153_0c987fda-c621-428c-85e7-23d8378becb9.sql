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