

## Mostrar todas as reuniões em /vendas, ordenadas por data

### Problema
O filtro padrão é "Esta semana", o que esconde reuniões como a da Ana Clara (agendada para outra data). O usuário quer ver **todas** por padrão, ordenadas por data.

### Mudanças

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/pages/Vendas.tsx` | Mudar default de `"this_week"` para `"all"` na linha 34 |
| 2 | `src/pages/Vendas.tsx` | Ordenar `meetings` por `data_reuniao` (desc) antes de passar ao table |

### Detalhe

**Linha 34:** `useState<PeriodType>("this_week")` → `useState<PeriodType>("all")`

**Linha 57 (após o filter):** Adicionar sort:
```typescript
const meetings = allMeetings
  .filter(m => !VENDAS_EXCLUDED.includes(m.status as CrmStatus))
  .sort((a, b) => {
    const dateA = a.data_reuniao ? new Date(a.data_reuniao).getTime() : 0;
    const dateB = b.data_reuniao ? new Date(b.data_reuniao).getTime() : 0;
    return dateB - dateA; // mais recentes primeiro
  });
```

O filtro de período continua disponível caso o usuário queira restringir a visualização.

