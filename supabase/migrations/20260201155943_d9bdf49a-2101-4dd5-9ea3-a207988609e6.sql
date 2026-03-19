-- =====================================================
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
USING (false);