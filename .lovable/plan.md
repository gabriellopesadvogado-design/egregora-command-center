

## Adaptar /vendas para layout exato da screenshot

### Problema

A tabela atual em /vendas tem colunas: Horário, Lead, Telefone, Data, Status, Ações, Valor, Closer, SDR, Observação. Faltam **Fonte** e **Qualificação**, e a ordem/nomes das colunas não batem com a screenshot.

### Colunas alvo (conforme screenshot)

| Horário | Lead | Telefone | Data | Fonte | Status | Ações | Qualificação | Valor Líquido | SDR | Obs |

### O que muda

**1. Adicionar coluna "Fonte"** (entre Data e Status)
- Mostrar `meeting.leads?.origem` (já vem no JOIN com crm_leads)
- Se nulo, usar "—"
- Dropdown editável como na screenshot (Select com opções: Google, Meta, Blog, Orgânico, Indicação, Reativação, Outro)
- Ao trocar, UPDATE `crm_leads SET origem = valor WHERE id = meeting.lead_id`

**2. Adicionar coluna "Qualificação"**
- `crm_meetings` NÃO tem campo `avaliacao_reuniao`. Precisa de **migração SQL** para adicionar.
- `ALTER TABLE public.crm_meetings ADD COLUMN avaliacao_reuniao text;`
- Usar o componente `QualificacaoSelect` já existente (Ruim 👎, Bom 👍, Muito Bom 🌟)
- Ao trocar, UPDATE `crm_meetings SET avaliacao_reuniao = valor`
- Atualizar `enrichMeeting` para pegar o campo real em vez de `null`

**3. Renomear "Valor" → "Valor Líquido"**
- Só mudar o header text

**4. Remover coluna "Closer"**
- Na screenshot não aparece coluna Closer — apenas SDR (e possivelmente Closer cortado à direita)
- Manter Closer visível mas após SDR, para scroll horizontal

**5. Reordenar colunas** para bater com screenshot:
Horário → Lead → Telefone → Data → Fonte → Status → Ações → Qualificação → Valor Líquido → SDR → Observação

### Arquivos

| # | Arquivo | Ação |
|---|---------|------|
| 1 | SQL migration | `ALTER TABLE crm_meetings ADD COLUMN avaliacao_reuniao text` |
| 2 | `src/integrations/supabase/types.ts` | Adicionar `avaliacao_reuniao` ao tipo crm_meetings |
| 3 | `src/hooks/useMeetings.ts` | Atualizar `enrichMeeting` para usar campo real; remover delete de `avaliacao_reuniao` no update |
| 4 | `src/components/vendas/VendasTable.tsx` | Reordenar colunas, adicionar Fonte + Qualificação, renomear Valor Líquido |

### Detalhes técnicos

**Fonte dropdown na tabela**: Select inline com opções fixas. Ao mudar, faz `supabase.from("crm_leads").update({ origem: valor }).eq("id", meeting.lead_id)` e invalida queries.

**Qualificação**: Importar e usar `QualificacaoSelect` existente. `onValueChange` faz `updateMeeting.mutateAsync({ id: meeting.id, avaliacao_reuniao: valor })`.

**enrichMeeting update**: Mudar `avaliacao_reuniao: null` → `avaliacao_reuniao: raw.avaliacao_reuniao` e remover o `delete mapped.avaliacao_reuniao` no update mutation.

