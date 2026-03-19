-- Helper function to check if user is admin or gestor
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
WITH CHECK (closer_id = auth.uid() OR sdr_id = auth.uid() OR is_admin_or_gestor(auth.uid()));