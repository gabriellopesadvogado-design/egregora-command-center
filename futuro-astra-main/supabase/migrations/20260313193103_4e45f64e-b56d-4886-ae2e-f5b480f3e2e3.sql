-- 1. Bucket privado para PDFs gerados
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_pdfs', 'proposal_pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela proposal_documents
CREATE TABLE public.proposal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid,
  lead_id uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  file_size integer,
  validity_date date,
  payment_mode text,
  payment_text text,
  total_original numeric,
  total_final numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_documents_proposal_id ON public.proposal_documents(proposal_id);
CREATE INDEX idx_proposal_documents_lead_id ON public.proposal_documents(lead_id);
CREATE INDEX idx_proposal_documents_created_by ON public.proposal_documents(created_by);

ALTER TABLE public.proposal_documents ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies na tabela
CREATE POLICY "Admin/Manager can view all documents"
ON public.proposal_documents FOR SELECT TO authenticated
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view own documents"
ON public.proposal_documents FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Authenticated can insert documents"
ON public.proposal_documents FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin/Manager can update documents"
ON public.proposal_documents FOR UPDATE TO authenticated
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can delete documents"
ON public.proposal_documents FOR DELETE TO authenticated
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Block anonymous proposal_documents"
ON public.proposal_documents FOR ALL TO anon
USING (false);

-- 4. Storage policies para proposal_pdfs
CREATE POLICY "Users can read own PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proposal_pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'proposal_pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'proposal_pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admin can read all PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proposal_pdfs' AND is_admin_or_manager(auth.uid()));