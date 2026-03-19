import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateLead } from "@/hooks/useLeads";
import { toast } from "sonner";

interface NewLeadModalProps {
  open: boolean;
  onClose: () => void;
}

const origemOptions = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "indicacao", label: "Indicação" },
  { value: "organico", label: "Orgânico" },
  { value: "hubspot_direto", label: "HubSpot Direto" },
  { value: "reativacao", label: "Reativação" },
];

const canalOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "site", label: "Site" },
  { value: "direto", label: "Direto" },
];

const tipoInteresseOptions = [
  { value: "nacionalidade_portuguesa", label: "Nacionalidade Portuguesa" },
  { value: "residencia_brasileira", label: "Residência Brasileira" },
  { value: "outro", label: "Outro" },
];

export function NewLeadModal({ open, onClose }: NewLeadModalProps) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [canal, setCanal] = useState("");
  const [nacionalidade, setNacionalidade] = useState("");
  const [paisResidencia, setPaisResidencia] = useState("");
  const [tipoInteresse, setTipoInteresse] = useState("");

  const createLead = useCreateLead();

  const resetForm = () => {
    setNome(""); setWhatsapp(""); setEmail(""); setTelefone("");
    setOrigem(""); setCanal(""); setNacionalidade("");
    setPaisResidencia(""); setTipoInteresse("");
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !whatsapp.trim()) {
      toast.error("Nome e WhatsApp são obrigatórios");
      return;
    }

    try {
      await createLead.mutateAsync({
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        origem: origem || null,
        canal: canal || null,
        nacionalidade: nacionalidade.trim() || null,
        pais_residencia: paisResidencia.trim() || null,
        tipo_interesse: tipoInteresse || null,
      });
      toast.success(`Lead ${nome} cadastrado`);
      resetForm();
      onClose();
    } catch {
      toast.error("Erro ao criar lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>Preencha os dados do novo lead.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+55 11 99999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+55 11 99999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {origemOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {canalOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nacionalidade</Label>
              <Input value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>País de Residência</Label>
              <Input value={paisResidencia} onChange={(e) => setPaisResidencia(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Interesse</Label>
            <Select value={tipoInteresse} onValueChange={setTipoInteresse}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {tipoInteresseOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createLead.isPending}>
            {createLead.isPending ? "Salvando..." : "Salvar Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
