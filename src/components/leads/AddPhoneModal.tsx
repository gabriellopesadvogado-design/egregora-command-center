import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { validatePhone, PHONE_ERROR_MESSAGE } from "@/utils/normalizePhone";
import { useUpdateMeeting } from "@/hooks/useMeetings";
import { toast } from "sonner";

interface AddPhoneModalProps {
  open: boolean;
  onClose: () => void;
  leadName: string;
  meetingId: string;
}

export function AddPhoneModal({ open, onClose, leadName, meetingId }: AddPhoneModalProps) {
  const [telefone, setTelefone] = useState("");
  const [error, setError] = useState("");
  const updateMeeting = useUpdateMeeting();

  const handleSave = async () => {
    const { valid, normalized } = validatePhone(telefone);
    if (!valid) {
      setError(PHONE_ERROR_MESSAGE);
      return;
    }
    setError("");

    try {
      await updateMeeting.mutateAsync({
        id: meetingId,
        telefone: normalized,
      });
      toast.success("Telefone adicionado!");
      setTelefone("");
      onClose();
    } catch {
      toast.error("Erro ao salvar telefone");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTelefone("");
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Telefone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lead</Label>
            <p className="font-medium">{leadName}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone-input">Telefone</Label>
            <Input
              id="phone-input"
              type="tel"
              placeholder="Ex: +55 11 99999-9999"
              value={telefone}
              onChange={(e) => {
                setTelefone(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMeeting.isPending}>
            {updateMeeting.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
