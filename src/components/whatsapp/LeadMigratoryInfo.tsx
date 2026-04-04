import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  FileText, 
  Calendar, 
  Users, 
  Baby, 
  Languages,
  Save,
  AlertTriangle
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadMigratoryInfoProps {
  leadId: string | null;
  contactId: string;
}

interface MigratoryData {
  nacionalidade: string | null;
  servico_interesse: string | null;
  rnm_data_emissao: string | null;
  rnm_data_vencimento: string | null;
  rnm_classificacao: string | null;
  casado_conjuge_brasileiro: boolean;
  possui_filhos_brasileiros: boolean;
  pais_lingua_portuguesa: boolean;
}

const SERVICO_OPTIONS = [
  { value: "autorizacao_residencia", label: "Autorização de Residência" },
  { value: "naturalizacao_brasileira", label: "Naturalização Brasileira" },
  { value: "outro_servico_migratorio", label: "Outro Serviço Migratório" },
];

const RNM_OPTIONS = [
  { value: "temporario", label: "RNM Temporário" },
  { value: "indeterminado", label: "RNM Indeterminado" },
  { value: "nao_possui", label: "Não Possui RNM" },
];

const PAISES_LINGUA_PORTUGUESA = [
  "Brasil", "Portugal", "Angola", "Moçambique", "Cabo Verde", 
  "Guiné-Bissau", "São Tomé e Príncipe", "Timor-Leste", "Guiné Equatorial"
];

export function LeadMigratoryInfo({ leadId, contactId }: LeadMigratoryInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<MigratoryData>({
    nacionalidade: null,
    servico_interesse: null,
    rnm_data_emissao: null,
    rnm_data_vencimento: null,
    rnm_classificacao: null,
    casado_conjuge_brasileiro: false,
    possui_filhos_brasileiros: false,
    pais_lingua_portuguesa: false,
  });
  const queryClient = useQueryClient();

  // Buscar dados do lead
  const { data: leadData, isLoading } = useQuery({
    queryKey: ["lead-migratory", leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from("crm_leads")
        .select("nacionalidade, servico_interesse, rnm_data_emissao, rnm_data_vencimento, rnm_classificacao, casado_conjuge_brasileiro, possui_filhos_brasileiros, pais_lingua_portuguesa")
        .eq("id", leadId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  useEffect(() => {
    if (leadData) {
      setFormData({
        nacionalidade: leadData.nacionalidade,
        servico_interesse: leadData.servico_interesse,
        rnm_data_emissao: leadData.rnm_data_emissao,
        rnm_data_vencimento: leadData.rnm_data_vencimento,
        rnm_classificacao: leadData.rnm_classificacao,
        casado_conjuge_brasileiro: leadData.casado_conjuge_brasileiro || false,
        possui_filhos_brasileiros: leadData.possui_filhos_brasileiros || false,
        pais_lingua_portuguesa: leadData.pais_lingua_portuguesa || false,
      });
    }
  }, [leadData]);

  // Atualizar automaticamente pais_lingua_portuguesa baseado na nacionalidade
  useEffect(() => {
    if (formData.nacionalidade) {
      const isLusofono = PAISES_LINGUA_PORTUGUESA.some(
        p => formData.nacionalidade?.toLowerCase().includes(p.toLowerCase())
      );
      if (isLusofono !== formData.pais_lingua_portuguesa) {
        setFormData(prev => ({ ...prev, pais_lingua_portuguesa: isLusofono }));
      }
    }
  }, [formData.nacionalidade]);

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (data: MigratoryData) => {
      if (!leadId) throw new Error("Lead não vinculado");
      const { error } = await supabase
        .from("crm_leads")
        .update(data)
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-migratory", leadId] });
      queryClient.invalidateQueries({ queryKey: ["contact-pipeline", contactId] });
      toast.success("Informações migratórias salvas");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Calcular dias para vencimento do RNM
  const diasParaVencimento = formData.rnm_data_vencimento
    ? differenceInDays(parseISO(formData.rnm_data_vencimento), new Date())
    : null;

  const getRnmAlertColor = () => {
    if (!diasParaVencimento) return null;
    if (diasParaVencimento < 0) return "text-red-500 bg-red-500/10";
    if (diasParaVencimento < 90) return "text-amber-500 bg-amber-500/10";
    if (diasParaVencimento < 180) return "text-yellow-500 bg-yellow-500/10";
    return "text-green-500 bg-green-500/10";
  };

  if (!leadId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-muted-foreground text-sm">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Lead não vinculado. Dados migratórios indisponíveis.
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Informações Migratórias
                {formData.nacionalidade && (
                  <Badge variant="outline" className="text-xs">
                    {formData.nacionalidade}
                  </Badge>
                )}
                {diasParaVencimento !== null && diasParaVencimento < 180 && (
                  <Badge className={`text-xs ${getRnmAlertColor()}`}>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    RNM: {diasParaVencimento < 0 ? "Vencido" : `${diasParaVencimento}d`}
                  </Badge>
                )}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Nacionalidade e Serviço */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nacionalidade</Label>
                <Input
                  value={formData.nacionalidade || ""}
                  onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                  placeholder="Ex: Venezuela"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Serviço de Interesse</Label>
                <Select
                  value={formData.servico_interesse || ""}
                  onValueChange={(v) => setFormData({ ...formData, servico_interesse: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* RNM */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Registro Nacional Migratório (RNM)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Classificação</Label>
                  <Select
                    value={formData.rnm_classificacao || ""}
                    onValueChange={(v) => setFormData({ ...formData, rnm_classificacao: v })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RNM_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Emissão</Label>
                  <Input
                    type="date"
                    value={formData.rnm_data_emissao || ""}
                    onChange={(e) => setFormData({ ...formData, rnm_data_emissao: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Vencimento</Label>
                  <Input
                    type="date"
                    value={formData.rnm_data_vencimento || ""}
                    onChange={(e) => setFormData({ ...formData, rnm_data_vencimento: e.target.value })}
                    className={`h-8 text-sm ${getRnmAlertColor()}`}
                  />
                </div>
              </div>
              {diasParaVencimento !== null && (
                <p className={`text-xs ${getRnmAlertColor()} px-2 py-1 rounded`}>
                  {diasParaVencimento < 0 
                    ? `⚠️ RNM vencido há ${Math.abs(diasParaVencimento)} dias`
                    : diasParaVencimento < 90
                    ? `⚠️ RNM vence em ${diasParaVencimento} dias — oportunidade de reativação!`
                    : `RNM válido por mais ${diasParaVencimento} dias`}
                </p>
              )}
            </div>

            {/* Condições especiais */}
            <div className="space-y-2">
              <Label className="text-xs">Condições Especiais</Label>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Casado(a) com cônjuge brasileiro</span>
                  </div>
                  <Switch
                    checked={formData.casado_conjuge_brasileiro}
                    onCheckedChange={(v) => setFormData({ ...formData, casado_conjuge_brasileiro: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Possui filhos brasileiros</span>
                  </div>
                  <Switch
                    checked={formData.possui_filhos_brasileiros}
                    onCheckedChange={(v) => setFormData({ ...formData, possui_filhos_brasileiros: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">País de língua portuguesa</span>
                  </div>
                  <Switch
                    checked={formData.pais_lingua_portuguesa}
                    onCheckedChange={(v) => setFormData({ ...formData, pais_lingua_portuguesa: v })}
                  />
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <Button 
              onClick={() => saveMutation.mutate(formData)} 
              disabled={saveMutation.isPending}
              className="w-full"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar Informações"}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
