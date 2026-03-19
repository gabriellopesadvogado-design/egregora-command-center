import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus, Trash2, DollarSign } from "lucide-react";
import type { TrafficSpend } from "@/hooks/useWbrAiReports";

interface TrafficInputsProps {
  value: TrafficSpend | null;
  onChange: (value: TrafficSpend | null) => void;
}

export function TrafficInputs({ value, onChange }: TrafficInputsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [level, setLevel] = useState<"plataforma" | "campanha" | "adgroup">(
    value?.level || "plataforma"
  );

  const handleLevelChange = (newLevel: "plataforma" | "campanha" | "adgroup") => {
    setLevel(newLevel);
    onChange({
      level: newLevel,
      google_total: value?.google_total,
      meta_total: value?.meta_total,
      google_by_campaign: newLevel === "campanha" ? value?.google_by_campaign || [] : undefined,
      meta_by_campaign: newLevel === "campanha" ? value?.meta_by_campaign || [] : undefined,
      google_by_adgroup: newLevel === "adgroup" ? value?.google_by_adgroup || [] : undefined,
      meta_by_adset: newLevel === "adgroup" ? value?.meta_by_adset || [] : undefined,
    });
  };

  const handleTotalChange = (platform: "google" | "meta", amount: number) => {
    onChange({
      ...value,
      level,
      [platform === "google" ? "google_total" : "meta_total"]: amount || undefined,
    });
  };

  const addCampaign = (platform: "google" | "meta") => {
    const key = platform === "google" ? "google_by_campaign" : "meta_by_campaign";
    const current = value?.[key] || [];
    onChange({
      ...value,
      level,
      [key]: [...current, { campaign_name: "", spend_rs: 0 }],
    });
  };

  const updateCampaign = (
    platform: "google" | "meta",
    index: number,
    field: "campaign_name" | "spend_rs",
    newValue: string | number
  ) => {
    const key = platform === "google" ? "google_by_campaign" : "meta_by_campaign";
    const current = [...(value?.[key] || [])];
    current[index] = { ...current[index], [field]: newValue };
    onChange({ ...value, level, [key]: current });
  };

  const removeCampaign = (platform: "google" | "meta", index: number) => {
    const key = platform === "google" ? "google_by_campaign" : "meta_by_campaign";
    const current = [...(value?.[key] || [])];
    current.splice(index, 1);
    onChange({ ...value, level, [key]: current });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          type="button"
        >
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Dados de Tráfego (Opcional)
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>Nível de Detalhamento</Label>
          <Select value={level} onValueChange={handleLevelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plataforma">Por Plataforma</SelectItem>
              <SelectItem value="campanha">Por Campanha</SelectItem>
              <SelectItem value="adgroup">Por Grupo de Anúncio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {level === "plataforma" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Google Ads (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={value?.google_total || ""}
                onChange={(e) =>
                  handleTotalChange("google", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Meta Ads (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={value?.meta_total || ""}
                onChange={(e) =>
                  handleTotalChange("meta", parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>
        )}

        {level === "campanha" && (
          <div className="space-y-4">
            {/* Google Campaigns */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Campanhas Google</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCampaign("google")}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar
                </Button>
              </div>
              {value?.google_by_campaign?.map((campaign, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Nome da campanha"
                    value={campaign.campaign_name}
                    onChange={(e) =>
                      updateCampaign("google", index, "campaign_name", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="R$"
                    value={campaign.spend_rs || ""}
                    onChange={(e) =>
                      updateCampaign(
                        "google",
                        index,
                        "spend_rs",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCampaign("google", index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Meta Campaigns */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Campanhas Meta</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCampaign("meta")}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar
                </Button>
              </div>
              {value?.meta_by_campaign?.map((campaign, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Nome da campanha"
                    value={campaign.campaign_name}
                    onChange={(e) =>
                      updateCampaign("meta", index, "campaign_name", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="R$"
                    value={campaign.spend_rs || ""}
                    onChange={(e) =>
                      updateCampaign(
                        "meta",
                        index,
                        "spend_rs",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCampaign("meta", index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {level === "adgroup" && (
          <p className="text-sm text-muted-foreground">
            Detalhamento por Grupo de Anúncio disponível em breve. Use o nível
            "Campanha" por enquanto.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
