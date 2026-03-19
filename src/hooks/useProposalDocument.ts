import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateProposalPdfBlob } from "@/components/proposals/proposalPdfBlob";
import type { ProposalPDFProps } from "@/components/proposals/ProposalPDF";

export interface SaveProposalPdfInput extends ProposalPDFProps {
  proposalId: string | null;
  leadId: string | null;
}

export interface SaveProposalPdfResult {
  signedUrl: string;
  document: { id: string; file_path: string; file_name: string };
}

export function useSaveProposalPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveProposalPdfInput): Promise<SaveProposalPdfResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const blob = await generateProposalPdfBlob(input);

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeName = input.leadName.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim().replace(/\s+/g, "_");
      const fileName = `Proposta_Egregora_${safeName}_${dateStr}.pdf`;
      const proposalFolder = input.proposalId || "sem-proposal-id";
      const filePath = `${user.id}/${proposalFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("proposal_pdfs")
        .upload(filePath, blob, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw uploadError;

      // Since proposal_documents table doesn't exist in the new schema,
      // just return the signed URL directly
      const { data: signedData, error: signedError } = await supabase.storage
        .from("proposal_pdfs")
        .createSignedUrl(filePath, 60 * 60 * 24);
      if (signedError) throw signedError;

      return {
        signedUrl: signedData.signedUrl,
        document: { id: "", file_path: filePath, file_name: fileName },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-documents"] });
    },
  });
}

export function useLatestProposalPdf(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal-documents", "latest", proposalId],
    queryFn: async () => {
      return null; // proposal_documents table doesn't exist
    },
    enabled: !!proposalId,
  });
}

export function useProposalDocumentSignedUrl() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from("proposal_pdfs")
        .createSignedUrl(filePath, 60 * 60 * 24);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
