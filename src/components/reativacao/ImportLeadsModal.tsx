import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedLead {
  telefone: string;
  pais_nascimento?: string;
  tempo_residencia_brasil_anos?: number;
  rnm_classificacao?: string;
  rnm_data_vencimento?: string;
  casado_conjuge_brasileiro?: boolean;
  possui_filhos_brasileiros?: boolean;
  possui_pais_brasileiros?: boolean;
  pais_lingua_portuguesa?: boolean;
  possui_certificado_portugues?: boolean;
  servico_interesse?: string;
  // Campos de match
  nome?: string;
  email?: string;
  _row?: number;
  _status?: "pending" | "success" | "error" | "not_found";
  _message?: string;
}

const CAMPOS_OBRIGATORIOS = [
  { campo: "telefone", label: "Telefone/WhatsApp", descricao: "Usado para encontrar o lead no sistema", obrigatorio: true },
];

const CAMPOS_QUALIFICACAO = [
  { campo: "pais_nascimento", label: "País de Nascimento", exemplo: "Venezuela", obrigatorio: false },
  { campo: "tempo_residencia_brasil_anos", label: "Anos no Brasil", exemplo: "4", obrigatorio: false },
  { campo: "rnm_classificacao", label: "Tipo RNM", exemplo: "indeterminado, temporario, nao_possui", obrigatorio: false },
  { campo: "rnm_data_vencimento", label: "Vencimento RNM", exemplo: "2026-12-31", obrigatorio: false },
  { campo: "casado_conjuge_brasileiro", label: "Cônjuge Brasileiro", exemplo: "sim, não, true, false", obrigatorio: false },
  { campo: "possui_filhos_brasileiros", label: "Filhos Brasileiros", exemplo: "sim, não, true, false", obrigatorio: false },
  { campo: "possui_pais_brasileiros", label: "Pais Brasileiros", exemplo: "sim, não, true, false", obrigatorio: false },
  { campo: "pais_lingua_portuguesa", label: "País Lusófono", exemplo: "sim, não (auto-detectado pelo país)", obrigatorio: false },
  { campo: "possui_certificado_portugues", label: "Celpe-Bras", exemplo: "sim, não, true, false", obrigatorio: false },
  { campo: "servico_interesse", label: "Serviço de Interesse", exemplo: "naturalizacao_brasileira, autorizacao_residencia", obrigatorio: false },
];

const PAISES_LUSOFONOS = [
  "portugal", "angola", "moçambique", "mocambique", "cabo verde", "guiné-bissau", 
  "guine-bissau", "são tomé", "sao tome", "timor-leste", "timor leste", "guiné equatorial"
];

export function ImportLeadsModal({ open, onOpenChange }: ImportLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; notFound: number; errors: number }>({ success: 0, notFound: 0, errors: 0 });
  const [activeTab, setActiveTab] = useState("upload");
  const queryClient = useQueryClient();

  const parseBoolean = (value: string | undefined): boolean => {
    if (!value) return false;
    const v = value.toString().toLowerCase().trim();
    return ["sim", "yes", "true", "1", "s", "y"].includes(v);
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, "");
  };

  const detectLusofono = (pais: string | undefined): boolean => {
    if (!pais) return false;
    return PAISES_LUSOFONOS.some(p => pais.toLowerCase().includes(p));
  };

  const parseCSV = useCallback((text: string): ParsedLead[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detectar separador (vírgula ou ponto-e-vírgula)
    const separator = lines[0].includes(";") ? ";" : ",";
    
    const headers = lines[0].split(separator).map(h => 
      h.trim().toLowerCase()
        .replace(/[áàâã]/g, "a")
        .replace(/[éèê]/g, "e")
        .replace(/[íìî]/g, "i")
        .replace(/[óòôõ]/g, "o")
        .replace(/[úùû]/g, "u")
        .replace(/ç/g, "c")
        .replace(/\s+/g, "_")
        .replace(/[^\w]/g, "")
    );

    const leads: ParsedLead[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/^["']|["']$/g, ""));
      const lead: ParsedLead = { telefone: "", _row: i + 1, _status: "pending" };
      
      headers.forEach((header, idx) => {
        const value = values[idx];
        if (!value) return;

        // Mapear headers para campos do banco
        if (["telefone", "whatsapp", "phone", "celular", "tel"].includes(header)) {
          lead.telefone = normalizePhone(value);
        } else if (["pais_nascimento", "pais", "nacionalidade", "country", "pais_de_nascimento"].includes(header)) {
          lead.pais_nascimento = value;
          lead.pais_lingua_portuguesa = detectLusofono(value);
        } else if (["tempo_residencia_brasil_anos", "anos_brasil", "tempo_brasil", "anos_no_brasil", "tempo_residencia"].includes(header)) {
          lead.tempo_residencia_brasil_anos = parseInt(value) || 0;
        } else if (["rnm_classificacao", "tipo_rnm", "rnm", "classificacao_rnm"].includes(header)) {
          const v = value.toLowerCase();
          if (v.includes("indet")) lead.rnm_classificacao = "indeterminado";
          else if (v.includes("temp")) lead.rnm_classificacao = "temporario";
          else if (v.includes("não") || v.includes("nao") || v === "n") lead.rnm_classificacao = "nao_possui";
          else lead.rnm_classificacao = value;
        } else if (["rnm_data_vencimento", "vencimento_rnm", "data_vencimento", "vencimento"].includes(header)) {
          // Tentar parsear data
          if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            lead.rnm_data_vencimento = value;
          } else if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const [d, m, y] = value.split("/");
            lead.rnm_data_vencimento = `${y}-${m}-${d}`;
          }
        } else if (["casado_conjuge_brasileiro", "conjuge_brasileiro", "casado_br", "conjuge_br", "casado"].includes(header)) {
          lead.casado_conjuge_brasileiro = parseBoolean(value);
        } else if (["possui_filhos_brasileiros", "filhos_brasileiros", "filhos_br", "filhos"].includes(header)) {
          lead.possui_filhos_brasileiros = parseBoolean(value);
        } else if (["possui_pais_brasileiros", "pais_brasileiros", "pais_br"].includes(header)) {
          lead.possui_pais_brasileiros = parseBoolean(value);
        } else if (["pais_lingua_portuguesa", "lusofono", "pais_lusofono"].includes(header)) {
          lead.pais_lingua_portuguesa = parseBoolean(value);
        } else if (["possui_certificado_portugues", "celpe_bras", "celpebras", "certificado_portugues"].includes(header)) {
          lead.possui_certificado_portugues = parseBoolean(value);
        } else if (["servico_interesse", "servico", "interesse", "tipo_servico"].includes(header)) {
          const v = value.toLowerCase();
          if (v.includes("natural")) lead.servico_interesse = "naturalizacao_brasileira";
          else if (v.includes("resid") || v.includes("autoriz")) lead.servico_interesse = "autorizacao_residencia";
          else lead.servico_interesse = "outro_servico_migratorio";
        } else if (["nome", "name", "nome_completo"].includes(header)) {
          lead.nome = value;
        } else if (["email", "e-mail", "e_mail"].includes(header)) {
          lead.email = value;
        }
      });

      if (lead.telefone) {
        leads.push(lead);
      }
    }

    return leads;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedLeads(parsed);
      setActiveTab("preview");
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) return;

    setImporting(true);
    setProgress(0);
    setResults({ success: 0, notFound: 0, errors: 0 });

    const updatedLeads = [...parsedLeads];
    let success = 0, notFound = 0, errors = 0;

    for (let i = 0; i < updatedLeads.length; i++) {
      const lead = updatedLeads[i];
      
      try {
        // Buscar lead pelo telefone usando ilike para ignorar + ou outros caracteres
        const phoneClean = lead.telefone;
        
        // Primeiro tenta match exato, depois ilike
        let { data: existingLeads } = await supabase
          .from("crm_leads")
          .select("id")
          .or(`telefone.eq.${phoneClean},whatsapp.eq.${phoneClean}`)
          .limit(1);
        
        // Se não encontrou, tenta com ilike (contém)
        if (!existingLeads?.length) {
          const { data: ilikeLead } = await supabase
            .from("crm_leads")
            .select("id")
            .or(`telefone.ilike.%${phoneClean}%,whatsapp.ilike.%${phoneClean}%`)
            .limit(1);
          existingLeads = ilikeLead;
        }
        
        const existingLead = existingLeads?.[0];

        if (searchError || !existingLead) {
          updatedLeads[i]._status = "not_found";
          updatedLeads[i]._message = "Lead não encontrado no sistema";
          notFound++;
        } else {
          // Preparar dados para update
          const updateData: Record<string, unknown> = {};
          
          if (lead.pais_nascimento) updateData.pais_nascimento = lead.pais_nascimento;
          if (lead.tempo_residencia_brasil_anos !== undefined) updateData.tempo_residencia_brasil_anos = lead.tempo_residencia_brasil_anos;
          if (lead.rnm_classificacao) updateData.rnm_classificacao = lead.rnm_classificacao;
          if (lead.rnm_data_vencimento) updateData.rnm_data_vencimento = lead.rnm_data_vencimento;
          if (lead.casado_conjuge_brasileiro !== undefined) updateData.casado_conjuge_brasileiro = lead.casado_conjuge_brasileiro;
          if (lead.possui_filhos_brasileiros !== undefined) updateData.possui_filhos_brasileiros = lead.possui_filhos_brasileiros;
          if (lead.possui_pais_brasileiros !== undefined) updateData.possui_pais_brasileiros = lead.possui_pais_brasileiros;
          if (lead.pais_lingua_portuguesa !== undefined) updateData.pais_lingua_portuguesa = lead.pais_lingua_portuguesa;
          if (lead.possui_certificado_portugues !== undefined) updateData.possui_certificado_portugues = lead.possui_certificado_portugues;
          if (lead.servico_interesse) updateData.servico_interesse = lead.servico_interesse;

          const { error: updateError } = await supabase
            .from("crm_leads")
            .update(updateData)
            .eq("id", existingLead.id);

          if (updateError) {
            updatedLeads[i]._status = "error";
            updatedLeads[i]._message = updateError.message;
            errors++;
          } else {
            updatedLeads[i]._status = "success";
            updatedLeads[i]._message = "Atualizado com sucesso";
            success++;
          }
        }
      } catch (err) {
        updatedLeads[i]._status = "error";
        updatedLeads[i]._message = "Erro inesperado";
        errors++;
      }

      setProgress(Math.round(((i + 1) / updatedLeads.length) * 100));
      setParsedLeads([...updatedLeads]);
    }

    setResults({ success, notFound, errors });
    setImporting(false);
    setActiveTab("results");
    
    // Invalidar cache
    queryClient.invalidateQueries({ queryKey: ["leads-perdidos-qualificados"] });
    
    toast.success(`Importação concluída: ${success} atualizados`);
  };

  const downloadTemplate = () => {
    const headers = [
      "telefone",
      "pais_nascimento",
      "tempo_residencia_brasil_anos",
      "rnm_classificacao",
      "rnm_data_vencimento",
      "casado_conjuge_brasileiro",
      "possui_filhos_brasileiros",
      "possui_pais_brasileiros",
      "possui_certificado_portugues",
      "servico_interesse"
    ];
    
    const exampleRow = [
      "5511999999999",
      "Venezuela",
      "4",
      "indeterminado",
      "2026-12-31",
      "sim",
      "não",
      "não",
      "não",
      "naturalizacao_brasileira"
    ];

    const csv = [headers.join(";"), exampleRow.join(";")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_qualificacao_leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setFile(null);
    setParsedLeads([]);
    setProgress(0);
    setResults({ success: 0, notFound: 0, errors: 0 });
    setActiveTab("upload");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetModal(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Qualificação de Leads
          </DialogTitle>
          <DialogDescription>
            Atualize os dados de qualificação de leads existentes via planilha CSV
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">1. Upload</TabsTrigger>
            <TabsTrigger value="preview" disabled={parsedLeads.length === 0}>
              2. Preview ({parsedLeads.length})
            </TabsTrigger>
            <TabsTrigger value="results" disabled={results.success === 0 && results.errors === 0 && results.notFound === 0}>
              3. Resultados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {/* Instruções */}
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Como funciona:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Baixe o template CSV abaixo</li>
                  <li>Preencha com os dados dos seus leads (telefone é obrigatório para match)</li>
                  <li>Faça upload do arquivo preenchido</li>
                  <li>O sistema encontra o lead pelo telefone e atualiza os dados</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Campos */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Campos disponíveis:</h4>
              <div className="grid grid-cols-2 gap-2">
                {[...CAMPOS_OBRIGATORIOS, ...CAMPOS_QUALIFICACAO].map((campo) => (
                  <div key={campo.campo} className="flex items-center gap-2 text-sm">
                    <Badge variant={campo.obrigatorio ? "default" : "outline"} className="text-xs">
                      {campo.campo}
                    </Badge>
                    <span className="text-muted-foreground">{campo.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Download template */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Template CSV
              </Button>
            </div>

            {/* Upload */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <p className="font-medium">Clique para selecionar arquivo CSV</p>
                  <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
                </div>
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            {parsedLeads.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {parsedLeads.length} leads encontrados no arquivo
                  </p>
                  <Badge variant="outline">{file?.name}</Badge>
                </div>

                <div className="border rounded-lg max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>País</TableHead>
                        <TableHead>Anos BR</TableHead>
                        <TableHead>RNM</TableHead>
                        <TableHead>Condições</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedLeads.slice(0, 50).map((lead, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{lead._row}</TableCell>
                          <TableCell className="font-mono text-sm">{lead.telefone}</TableCell>
                          <TableCell>{lead.pais_nascimento || "-"}</TableCell>
                          <TableCell>{lead.tempo_residencia_brasil_anos ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {lead.rnm_classificacao || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {[
                              lead.casado_conjuge_brasileiro && "💍",
                              lead.possui_filhos_brasileiros && "👶",
                              lead.possui_pais_brasileiros && "👨‍👩‍👧",
                              lead.pais_lingua_portuguesa && "🇧🇷",
                              lead.possui_certificado_portugues && "📜",
                            ].filter(Boolean).join(" ") || "-"}
                          </TableCell>
                          <TableCell>
                            {lead._status === "pending" && <Badge variant="outline">Pendente</Badge>}
                            {lead._status === "success" && <Badge className="bg-green-500/20 text-green-500">✓</Badge>}
                            {lead._status === "not_found" && <Badge className="bg-amber-500/20 text-amber-500">Não encontrado</Badge>}
                            {lead._status === "error" && <Badge className="bg-red-500/20 text-red-500">Erro</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {parsedLeads.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Mostrando 50 de {parsedLeads.length} leads
                  </p>
                )}

                {importing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Importando...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-500/30 bg-green-500/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-green-500">{results.success}</p>
                    <p className="text-sm text-muted-foreground">Atualizados</p>
                  </div>
                </div>
              </Card>
              <Card className="border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{results.notFound}</p>
                    <p className="text-sm text-muted-foreground">Não encontrados</p>
                  </div>
                </div>
              </Card>
              <Card className="border-red-500/30 bg-red-500/5 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-red-500">{results.errors}</p>
                    <p className="text-sm text-muted-foreground">Erros</p>
                  </div>
                </div>
              </Card>
            </div>

            {results.notFound > 0 && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {results.notFound} leads não foram encontrados no sistema pelo número de telefone.
                  Verifique se os números estão no formato correto (apenas dígitos, com DDI+DDD).
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {activeTab === "preview" && parsedLeads.length > 0 && !importing && (
            <Button onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              Importar {parsedLeads.length} leads
            </Button>
          )}
          {importing && (
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importando...
            </Button>
          )}
          {activeTab === "results" && (
            <Button variant="outline" onClick={resetModal}>
              Nova importação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
