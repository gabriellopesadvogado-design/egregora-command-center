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
import { ChevronDown, ChevronUp, Plus, Trash2, Users } from "lucide-react";
import type { SqlInputs as SqlInputsType } from "@/hooks/useWbrAiReports";

interface SqlInputsProps {
  value: SqlInputsType | null;
  onChange: (value: SqlInputsType | null) => void;
}

export function SqlInputs({ value, onChange }: SqlInputsProps) {
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
      by_campaign: newLevel === "campanha" ? value?.by_campaign || [] : undefined,
      by_adgroup_adset: newLevel === "adgroup" ? value?.by_adgroup_adset || [] : undefined,
    });
  };

  const handleTotalChange = (platform: "google" | "meta", count: number) => {
    onChange({
      ...value,
      level,
      [platform === "google" ? "google_total" : "meta_total"]: count || undefined,
    });
  };

  const addCampaign = () => {
    const current = value?.by_campaign || [];
    onChange({
      ...value,
      level,
      by_campaign: [...current, { platform: "google", campaign_name: "", sql_count: 0 }],
    });
  };

  const updateCampaign = (
    index: number,
    field: "platform" | "campaign_name" | "sql_count",
    newValue: string | number
  ) => {
    const current = [...(value?.by_campaign || [])];
    current[index] = { ...current[index], [field]: newValue };
    onChange({ ...value, level, by_campaign: current });
  };

  const removeCampaign = (index: number) => {
    const current = [...(value?.by_campaign || [])];
    current.splice(index, 1);
    onChange({ ...value, level, by_campaign: current });
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
            <Users className="h-4 w-4" />
            SQL - Leads Qualificados (Opcional)
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
              <Label>SQLs Google</Label>
              <Input
                type="number"
                placeholder="0"
                value={value?.google_total || ""}
                onChange={(e) =>
                  handleTotalChange("google", parseInt(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>SQLs Meta</Label>
              <Input
                type="number"
                placeholder="0"
                value={value?.meta_total || ""}
                onChange={(e) =>
                  handleTotalChange("meta", parseInt(e.target.value) || 0)
                }
              />
            </div>
          </div>
        )}

        {level === "campanha" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>SQLs por Campanha</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCampaign}
              >
                <Plus className="mr-1 h-3 w-3" />
                Adicionar
              </Button>
            </div>
            {value?.by_campaign?.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Select
                  value={item.platform}
                  onValueChange={(v) => updateCampaign(index, "platform", v)}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="meta">Meta</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Nome da campanha"
                  value={item.campaign_name}
                  onChange={(e) =>
                    updateCampaign(index, "campaign_name", e.target.value)
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="SQLs"
                  value={item.sql_count || ""}
                  onChange={(e) =>
                    updateCampaign(index, "sql_count", parseInt(e.target.value) || 0)
                  }
                  className="w-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCampaign(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
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
