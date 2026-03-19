import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Save, Copy, Loader2, Check, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { proposalServices } from "@/lib/proposal-services";
import { ProposalForm } from "./ProposalForm";
import { generateProposalPdfBlob } from "./proposalPdfBlob";
import { useSaveProposalPdf } from "@/hooks/useProposalDocument";
import type { Proposal } from "@/hooks/useProposals";
import type { ProposalServiceItem, ProposalPDFProps } from "./ProposalPDF";

interface ProposalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal?: Proposal;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function ProposalModal({ open, onOpenChange, proposal }: ProposalModalProps) {
  const { toast } = useToast();
  const saveMutation = useSaveProposalPdf();

  const [leadName, setLeadName] = useState(proposal?.leads?.nome || "");
  const [validityDate, setValidityDate] = useState(() => addDays(new Date(), 3));
  const [services, setServices] = useState<ProposalServiceItem[]>(() =>
    proposalServices.map((s) => ({ ...s, selected: false, value: s.defaultValue }))
  );
  const [paymentMode, setPaymentMode] = useState<"avista" | "parcelado" | "personalizado">("avista");
  const [paymentText, setPaymentText] = useState("");
  const [userEditedTotal, setUserEditedTotal] = useState(false);
  const [totalFinalManual, setTotalFinalManual] = useState(0);
  const [savedResult, setSavedResult] = useState<{ signedUrl: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const totalOriginal = useMemo(
    () => services.filter((s) => s.selected).reduce((sum, s) => sum + s.value, 0),
    [services]
  );
  const totalFinal = userEditedTotal ? totalFinalManual : totalOriginal;

  const handleServiceToggle = useCallback((id: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)));
  }, []);

  const handleServiceValueChange = useCallback((id: string, value: number) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
  }, []);

  const handleTotalFinalChange = useCallback((v: number) => {
    setUserEditedTotal(true);
    setTotalFinalManual(v);
  }, []);

  const pdfProps: ProposalPDFProps = {
    leadName,
    validityDate,
    services,
    paymentMode,
    paymentText,
    totalOriginal,
    totalFinal,
  };

  const dateStr = new Date().toISOString().slice(0, 10);
  const safeName = leadName.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").trim().replace(/\s+/g, "_");
  const pdfFileName = `Proposta_Egregora_${safeName}_${dateStr}.pdf`;

  const handleSave = async () => {
    try {
      const result = await saveMutation.mutateAsync({
        ...pdfProps,
        proposalId: proposal?.id || "avulso",
        leadId: proposal?.lead_id || "avulso",
      });
      setSavedResult(result);
      toast({ title: "PDF salvo com sucesso!", description: "O documento foi salvo no Astra." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await generateProposalPdfBlob(pdfProps);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };


  const handleCopyLink = async () => {
    if (!savedResult) return;
    await navigator.clipboard.writeText(savedResult.signedUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: "Link copiado!", description: "Válido por 24 horas." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar Proposta{proposal?.leads?.nome ? ` — ${proposal.leads.nome}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Left — Form */}
          <div className="overflow-y-auto pr-2">
            <ProposalForm
              leadName={leadName}
              onLeadNameChange={setLeadName}
              validityDate={validityDate}
              onValidityDateChange={setValidityDate}
              services={services}
              onServiceToggle={handleServiceToggle}
              onServiceValueChange={handleServiceValueChange}
              paymentMode={paymentMode}
              onPaymentModeChange={setPaymentMode}
              paymentText={paymentText}
              onPaymentTextChange={setPaymentText}
              totalOriginal={totalOriginal}
              totalFinal={totalFinal}
              onTotalFinalChange={handleTotalFinalChange}
            />
          </div>

          {/* Right — Placeholder */}
          <div className="hidden lg:flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Preencha os dados à esquerda e clique em <b>Baixar PDF</b> para visualizar o documento final.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border flex-wrap">
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            {downloading ? "Gerando..." : "Baixar PDF"}
          </Button>

          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar no Astra
          </Button>

          {savedResult && (
            <>
              <Button variant="outline" onClick={handleCopyLink}>
                {linkCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {linkCopied ? "Copiado!" : "Copiar link (24h)"}
              </Button>
              <a href={savedResult.signedUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar novamente
                </Button>
              </a>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
