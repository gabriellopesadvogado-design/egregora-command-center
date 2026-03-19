INSERT INTO storage.buckets (id, name, public) VALUES ('proposal_templates', 'proposal_templates', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for proposal_templates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'proposal_templates');

CREATE POLICY "Authenticated upload to proposal_templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposal_templates');