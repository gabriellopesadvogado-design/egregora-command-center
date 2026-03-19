CREATE POLICY "Authenticated can insert leads"
ON public.crm_leads FOR INSERT TO authenticated
WITH CHECK (true);