-- Criar tabela para histórico de relatórios WBR/IA
CREATE TABLE public.wbr_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('WBR_SEMANAL', 'ANALISE_MENSAL')),
  date_start date NOT NULL,
  date_end date NOT NULL,
  premium_mode boolean NOT NULL DEFAULT false,
  manual_inputs_json jsonb,
  report_context_snapshot jsonb,
  ai_output_json jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wbr_ai_reports ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access to wbr_ai_reports"
ON public.wbr_ai_reports
FOR ALL
TO anon
USING (false);

-- Admin/Manager can view all reports
CREATE POLICY "Admin/Manager can view all reports"
ON public.wbr_ai_reports
FOR SELECT
TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- Users can view own reports
CREATE POLICY "Users can view own reports"
ON public.wbr_ai_reports
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Authenticated users can insert their own reports
CREATE POLICY "Users can insert own reports"
ON public.wbr_ai_reports
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Admin/Manager can delete reports
CREATE POLICY "Admin/Manager can delete reports"
ON public.wbr_ai_reports
FOR DELETE
TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_wbr_ai_reports_created_by ON public.wbr_ai_reports(created_by);
CREATE INDEX idx_wbr_ai_reports_created_at ON public.wbr_ai_reports(created_at DESC);