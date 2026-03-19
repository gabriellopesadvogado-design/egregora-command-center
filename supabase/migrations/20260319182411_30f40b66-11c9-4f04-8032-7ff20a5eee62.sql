-- 1. Security definer function (bypasses RLS)
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
USING (responsavel_id = auth.uid() OR public.is_admin(auth.uid()));