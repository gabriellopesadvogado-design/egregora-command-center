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
  document: {
    id: string;
    file_path: string;
    file_name: string;
  };
}

export function useSaveProposalPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveProposalPdfInput): Promise<SaveProposalPdfResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Generate blob
      const blob = await generateProposalPdfBlob(input);

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeName = input.leadName.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim().replace(/\s+/g, "_");
      const fileName = `Proposta_Egregora_${safeName}_${dateStr}.pdf`;
      const proposalFolder = input.proposalId || "sem-proposal-id";
      const filePath = `${user.id}/${proposalFolder}/${fileName}`;

      // Upload to private bucket
      const { error: uploadError } = await supabase.storage
        .from("proposal_pdfs")
        .upload(filePath, blob, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw uploadError;

      // Insert document record
      const { data: doc, error: insertError } = await supabase
        .from("proposal_documents")
        .insert({
          proposal_id: input.proposalId,
          lead_id: input.leadId,
          created_by: user.id,
          file_path: filePath,
          file_name: fileName,
          file_size: blob.size,
          mime_type: "application/pdf",
          validity_date: input.validityDate.toISOString().slice(0, 10),
          payment_mode: input.paymentMode,
          payment_text: input.paymentText || null,
          total_original: input.totalOriginal,
          total_final: input.totalFinal,
        })
        .select("id, file_path, file_name")
        .single();
      if (insertError) throw insertError;

      // Create signed URL (24h)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("proposal_pdfs")
        .createSignedUrl(filePath, 60 * 60 * 24);
      if (signedError) throw signedError;

      return {
        signedUrl: signedData.signedUrl,
        document: doc,
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
      if (!proposalId) return null;
      const { data, error } = await supabase
        .from("proposal_documents")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
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
