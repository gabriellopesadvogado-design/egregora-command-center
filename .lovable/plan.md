

## Migração de Status — Correções Restantes

### Análise

Após inspeção completa do código, as referências de **tabelas** já estão todas migradas para `crm_*` / `core_*`. O campo `cargo` já é usado em `useAuth.tsx` e `core_users`. Os hooks (`useMeetings`, `useFollowups`, `useTargets`, etc.) e componentes de status (`StatusToggle`, `StatusVendasToggle`) já usam os novos valores do enum `crm_status`.

Restam **3 arquivos** com valores de status antigos que não correspondem ao enum do banco:

### Alterações

| # | Arquivo | Problema | Correção |
|---|---------|----------|----------|
| 1 | `src/components/pre-venda/QuickAddRow.tsx` | Usa `"agendada"`, `"aconteceu"`, `"cancelada"` como valores de status | Trocar para `"reuniao_agendada"`, `"reuniao_realizada"`. Remover opção `"cancelada"` (não é mais status do pipeline). |
| 2 | `src/pages/Followup.tsx` | Envia `outcome: "ganha"` ao edge function (que espera `"fechado"`). Usa `"perdida_simples"` / `"perdida_definitiva"` (edge function espera `"perdido_simples"` / `"perdido"`). Select com `value="ganha"` e `value="perdida"`. | Trocar `"ganha"` → `"fechado"`, `"perdida"` → `"perdido"`, `"perdida_simples"` → `"perdido_simples"`, `"perdida_definitiva"` → `"perdido"`. |
| 3 | `src/components/vendas/VendasLossModal.tsx` | Usa `"perdida_simples"` / `"perdida_definitiva"` como type e valores de radio | Trocar para `"perdido_simples"` / `"perdido"` para alinhar com o edge function `set-deal-outcome`. |

### Sem alteração necessária

- Todas as queries `.from()` já usam nomes `crm_*` / `core_*`
- `useAuth.tsx` já mapeia `cargo` para `role` internamente
- `StatusToggle.tsx` e `StatusVendasToggle.tsx` já usam enum completo
- Edge functions já usam `fechado` / `perdido` / `perdido_simples`
- `useDashboardStats.ts`, `useForecast.ts`, `useRecoveryStats.ts` já usam novos valores
- Nenhuma migração SQL necessária

