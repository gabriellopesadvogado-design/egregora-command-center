

## Adicionar coluna "Não Elegível" no Kanban

### Mudanças

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/components/pipeline/KanbanBoard.tsx` | Adicionar `{ status: "nao_elegivel", title: "Não Elegível", colorClass: "border-t-gray-400" }` após "Qualificado" (linha 19) |
| 2 | `src/pages/Pipeline.tsx` | Remover o filtro que exclui `nao_elegivel` (linha 35): trocar `.filter(m => m.status !== "nao_elegivel")` por simplesmente `meetings` |

Posição no enum: `qualificado → nao_elegivel → elegivel`, então a coluna fica entre "Qualificado" e "Elegível".

