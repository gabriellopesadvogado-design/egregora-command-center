

## Adicionar coluna Closer em /vendas

Editar `src/components/vendas/VendasTable.tsx` com 3 mudanças pontuais:

1. **Header** (linha 195): Adicionar `<TableHead className="w-[100px] font-semibold">Closer</TableHead>` entre SDR e Obs
2. **ColSpan** (linha 202): Mudar `colSpan={11}` para `colSpan={12}` no estado vazio
3. **Cell** (após linha 377): Adicionar `<TableCell className="text-sm text-muted-foreground">{meeting.closer?.nome || "—"}</TableCell>` entre SDR e Obs

