import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ComplianceRow } from "@/hooks/useFollowupCompliance";

interface Props {
  data: ComplianceRow[];
}

function formatPct(val: number | null) {
  if (val === null) return "—";
  return `${Math.round(val * 100)}%`;
}

function complianceBadge(val: number | null) {
  if (val === null) return <Badge variant="secondary">—</Badge>;
  const pct = Math.round(val * 100);
  if (pct >= 80) return <Badge className="bg-green-600 hover:bg-green-700 text-white">{pct}%</Badge>;
  if (pct >= 50) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{pct}%</Badge>;
  return <Badge variant="destructive">{pct}%</Badge>;
}

export function FollowupComplianceTable({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ranking de Cumprimento</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Closer</TableHead>
              <TableHead className="text-center">Cumpr.</TableHead>
              <TableHead className="text-center">Feitos</TableHead>
              <TableHead className="text-center">Devidos</TableHead>
              <TableHead className="text-center">Atrasados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  Sem dados no período
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={row.closer_id}>
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell>{row.closer_nome}</TableCell>
                  <TableCell className="text-center">{complianceBadge(row.compliance)}</TableCell>
                  <TableCell className="text-center">{row.done_total}</TableCell>
                  <TableCell className="text-center">{row.due_total}</TableCell>
                  <TableCell className="text-center">
                    <span className={row.overdue_total > 0 ? "text-destructive font-semibold" : ""}>
                      {row.overdue_total}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
