import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/proposal-format";
import type { ProposalServiceItem } from "./ProposalPDF";

interface ProposalFormProps {
  leadName: string;
  onLeadNameChange: (v: string) => void;
  validityDate: Date;
  onValidityDateChange: (v: Date) => void;
  services: ProposalServiceItem[];
  onServiceToggle: (id: string) => void;
  onServiceValueChange: (id: string, value: number) => void;
  paymentMode: "avista" | "parcelado" | "personalizado";
  onPaymentModeChange: (v: "avista" | "parcelado" | "personalizado") => void;
  paymentText: string;
  onPaymentTextChange: (v: string) => void;
  totalOriginal: number;
  totalFinal: number;
  onTotalFinalChange: (v: number) => void;
}

export function ProposalForm(props: ProposalFormProps) {
  const {
    leadName, onLeadNameChange,
    validityDate, onValidityDateChange,
    services, onServiceToggle, onServiceValueChange,
    paymentMode, onPaymentModeChange,
    paymentText, onPaymentTextChange,
    totalOriginal, totalFinal, onTotalFinalChange,
  } = props;

  const hasDiscount = totalFinal < totalOriginal;

  return (
    <div className="space-y-6">
      {/* Lead name */}
      <div className="space-y-2">
        <Label>Nome do Lead</Label>
        <Input value={leadName} onChange={(e) => onLeadNameChange(e.target.value)} />
      </div>

      {/* Validity date */}
      <div className="space-y-2">
        <Label>Validade da Proposta</Label>
        <Input
          type="date"
          value={validityDate.toISOString().slice(0, 10)}
          onChange={(e) => onValidityDateChange(new Date(e.target.value + "T12:00:00"))}
        />
      </div>

      {/* Services */}
      <div className="space-y-2">
        <Label>Serviços</Label>
        <div className="space-y-3 rounded-lg border border-border p-3">
          {services.map((svc) => (
            <div key={svc.id} className="flex items-center gap-3">
              <Checkbox
                checked={svc.selected}
                onCheckedChange={() => onServiceToggle(svc.id)}
              />
              <span className="flex-1 text-sm">{svc.name}</span>
              <Input
                type="number"
                className="w-28 text-right"
                value={svc.value}
                onChange={(e) => onServiceValueChange(svc.id, Number(e.target.value) || 0)}
                disabled={!svc.selected}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="space-y-2">
        <Label>Condição de Pagamento</Label>
        <Select value={paymentMode} onValueChange={onPaymentModeChange as (v: string) => void}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="avista">À vista</SelectItem>
            <SelectItem value="parcelado">Parcelado</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Texto adicional de pagamento</Label>
        <Input
          placeholder="Ex.: 3x no cartão sem juros"
          value={paymentText}
          onChange={(e) => onPaymentTextChange(e.target.value)}
        />
      </div>

      {/* Totals */}
      <div className="space-y-2 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total dos serviços</span>
          <span className={hasDiscount ? "line-through text-muted-foreground text-sm" : "font-semibold"}>
            {formatBRL(totalOriginal)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-semibold">Valor final</Label>
          <Input
            type="number"
            className="w-36 text-right font-bold"
            value={totalFinal}
            onChange={(e) => onTotalFinalChange(Number(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  );
}
