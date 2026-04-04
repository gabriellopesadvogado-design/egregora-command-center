import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CampaignRow {
  id: string;
  name: string;
  platform: 'meta' | 'google';
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach?: number;
  frequency?: number;
}

interface CampaignsTableProps {
  campaigns: CampaignRow[];
}

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0);
const fmtN = (n: number) => new Intl.NumberFormat('pt-BR').format(n ?? 0);
const fmtPct = (n: number) => `${(n ?? 0).toFixed(2)}%`;

export function CampaignsTable({ campaigns = [] }: CampaignsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Campanha</TableHead>
            <TableHead className="text-right text-muted-foreground">Gasto</TableHead>
            <TableHead className="text-right text-muted-foreground">Impressões</TableHead>
            <TableHead className="text-right text-muted-foreground">Cliques</TableHead>
            <TableHead className="text-right text-muted-foreground">CTR</TableHead>
            <TableHead className="text-right text-muted-foreground">CPC</TableHead>
            <TableHead className="text-right text-muted-foreground">CPM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhuma campanha encontrada.
              </TableCell>
            </TableRow>
          ) : campaigns.map((c) => (
            <TableRow key={c.id} className="border-border/50 hover:bg-muted/30">
              <TableCell className="font-medium max-w-[200px] truncate">
                <span title={c.name}>{c.name || '—'}</span>
              </TableCell>
              <TableCell className="text-right">{fmt(c.spend)}</TableCell>
              <TableCell className="text-right">{fmtN(c.impressions)}</TableCell>
              <TableCell className="text-right">{fmtN(c.clicks)}</TableCell>
              <TableCell className="text-right">{fmtPct(c.ctr)}</TableCell>
              <TableCell className="text-right">{fmt(c.cpc)}</TableCell>
              <TableCell className="text-right">{fmt(c.cpm)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
