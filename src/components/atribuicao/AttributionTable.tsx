import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CampaignData {
  campaign: string;
  leads: number;
  qualified: number;
  proposals: number;
  closed: number;
  revenue: number;
  spend: number;
  cpl: number;
  csql: number;
  cac: number;
  roas: number;
  avgDays: number;
}

interface AttributionTableProps {
  data: CampaignData[];
}

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { 
  style: "currency", 
  currency: "BRL",
  maximumFractionDigits: 0 
}).format(n);

export function AttributionTable({ data }: AttributionTableProps) {
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhum dado de campanha disponível
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-64">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-xs">Campanha</TableHead>
            <TableHead className="text-xs text-right">Leads</TableHead>
            <TableHead className="text-xs text-right">SQLs</TableHead>
            <TableHead className="text-xs text-right">C/SQL</TableHead>
            <TableHead className="text-xs text-right">CAC</TableHead>
            <TableHead className="text-xs text-right">ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 8).map((row) => (
            <TableRow key={row.campaign} className="border-border/50">
              <TableCell className="text-xs font-medium max-w-[100px] truncate" title={row.campaign}>
                {row.campaign}
              </TableCell>
              <TableCell className="text-xs text-right">{row.leads}</TableCell>
              <TableCell className="text-xs text-right">{row.proposals}</TableCell>
              <TableCell className="text-xs text-right">{fmt(row.csql)}</TableCell>
              <TableCell className="text-xs text-right">{fmt(row.cac)}</TableCell>
              <TableCell className="text-xs text-right">
                <Badge 
                  variant="secondary" 
                  className={row.roas >= 3 ? "bg-green-500/20 text-green-500" : row.roas >= 1 ? "bg-amber-500/20 text-amber-500" : "bg-red-500/20 text-red-500"}
                >
                  {row.roas.toFixed(1)}x
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
