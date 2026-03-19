

## Migração Crítica — Referências de Tabelas, Campos e Status

### Escopo

Esta migração atualiza **todas as referências restantes** a tabelas antigas, campos antigos e status antigos em edge functions e componentes frontend.

---

### Parte 1: Edge Functions (6 arquivos)

#### `supabase/functions/manage-users/index.ts`
- `profiles` → `core_users` (linhas 119, 162, 203)
- `user_roles` queries → remover (linhas 128-135, 174-177) — não existe mais `user_roles`; o cargo já está em `core_users`
- `{ nome, role }` → `{ nome, cargo: role }` (campo renomeado)
- `ALLOWED_ROLES` → expandir para incluir `gestor`, `analista_processos`

#### `supabase/functions/generate-followup-steps/index.ts`
- `.from("meetings")` → `.from("crm_meetings")` (linha 100)
- `.select("closer_id, primeiro_followup_em, inicio_em")` → `.select("closer_id, data_reuniao")` (não existe `primeiro_followup_em` nem `inicio_em`)
- `.from("followup_steps")` → `.from("crm_followup_steps")` (linha 149)
- Campos de insert: `closer_id` → `responsavel_id`, `data_prevista` → `data_programada`, `codigo` → `step_nome`

#### `supabase/functions/reschedule-followup/index.ts`
- `.from("meetings")` → `.from("crm_meetings")` (linha 67)
- `inicio_em` → `data_reuniao` (linha 69)
- `.from("followup_steps")` → `.from("crm_followup_steps")` (linhas 99, 108, 122, 146)
- Campos: `closer_id` → `responsavel_id`, `data_prevista` → `data_programada`, `executado_em` → `data_execucao`, `codigo` → `step_nome`
- `tipo` field check — verificar se existe na tabela `crm_followup_steps` (não existe; remover filtro `.eq("tipo", "padrao")`)

#### `supabase/functions/send-meeting-reminders/index.ts`
- `.from("meetings")` → `.from("crm_meetings")` (linha 44)
- `inicio_em` → `data_reuniao` (linhas 45, 47, 48)
- `.eq("status", "agendada")` → `.eq("status", "reuniao_agendada")` (linha 46)
- `leads(nome)` → `crm_leads!lead_id(nome)` (join)
- `.from("notifications")` → `.from("core_notifications")` (linhas 106, 114)
- Notification insert: adaptar campos para `core_notifications` schema (`titulo`, `mensagem`, `user_id`, `tipo`, `modulo_origem`)

#### `supabase/functions/generate-wbr-report/index.ts`
- `.from("meetings")` → `.from("crm_meetings")` (linhas 122, 131, 175, 183)
- `inicio_em` → `data_reuniao` (linhas 124, 125, 134, 135, 186, 187)
- `fechado_em` → `data_fechamento` (linhas 134, 135)
- `.eq("status", "ganha")` → `.eq("status", "fechado")` (linha 133)
- `fonte_lead` → `origem` no contexto de crm_leads (ou remover se não existe em crm_meetings)
- `valor_fechado` → `valor_fechamento` (linhas 303, 314, etc.)
- `caixa_gerado` → campo não existe; remover ou substituir
- `.from("profiles")` → `.from("core_users")` (linha 141)
- `.select("id, nome, role")` → `.select("id, nome, cargo")` (linha 142)
- `.from("weekly_targets")` → `.from("crm_weekly_targets")` (linha 148)
- `.from("monthly_targets")` → `.from("crm_monthly_targets")` (linha 158)
- `.from("yearly_targets")` → `.from("crm_yearly_targets")` (linha 167)
- `.from("wbr_ai_reports")` → `.from("crm_wbr_ai_reports")` (linha 740)
- Status antigos: `"aconteceu"` → `"reuniao_realizada"`, `"ganha"` → `"fechado"`, `"perdida"` → `"perdido"`, `"no_show"` e `"cancelada"` → remover do pipeline
- `avaliacao_reuniao` → campo não existe em `crm_meetings`; remover referências
- `valor_proposta` → campo existe, OK
- Meta fields: `meta_reunioes_realizadas` → `meta_reunioes`, `meta_fechamentos_qtd` → `meta_fechamentos`, `meta_faturamento` → `meta_valor`, `mes_ano` → `mes`, `semana_fim` → calculado

#### `supabase/functions/migrate-existing-leads/index.ts`
- `.from("user_roles")` → `.from("core_users")` (linha 108)
- `.select("role").eq("role", "admin")` → `.select("cargo").eq("cargo", "admin")` (linhas 109-111)
- `.from("meetings")` → `.from("crm_meetings")` (linhas 138, 154)
- `inicio_em` → `data_reuniao` (linha 139)
- `.from("followup_steps")` → `.from("crm_followup_steps")` (linha 192)
- `closer_id` → `responsavel_id`, `data_prevista` → `data_programada`, `codigo` → `step_nome`

#### `supabase/functions/set-deal-outcome/index.ts`
- `.from("meetings")` → `.from("crm_meetings")` (linhas 68, 103, 121, 139)
- `inicio_em` → `data_reuniao` (linha 69)
- `"ganha"` → `"fechado"` (linhas 56, 105)
- `"perdida"` e `"perdida_simples"/"perdida_definitiva"` → `"perdido"` (linhas 56, 124, 137, 141)
- `fechado_em` → `data_fechamento` (linha 106)
- `perda_tipo` → campo não existe; remover
- `.from("followup_steps")` → `.from("crm_followup_steps")` (linhas 113, 132, 172)
- `closer_id` → `responsavel_id`, `data_prevista` → `data_programada`, `codigo` → `step_nome`

---

### Parte 2: Frontend (src) — Componentes e Páginas

#### `src/pages/Users.tsx` (linha 16)
- `profile.role` → `profile.role` (já mapeado no useAuth como `role` do profile)
- Porém o Profile interface usa `role` que vem de `cargo`. Verificar: `"manager"` → `"gestor"`

#### `src/pages/Meetings.tsx` (linhas 121, 140)
- `status: "agendada"` → `"reuniao_agendada"` (linha 121)
- `status: "perdida"` → `"perdido"` (linha 140)

#### `src/pages/Proposals.tsx` (linha 78)
- `"ganha"` → `"fechado"`, `"perdida"` → `"perdido"`

#### `src/components/pre-venda/CloserDayAgenda.tsx` (linhas 9, 21)
- `"aconteceu"` → `"reuniao_realizada"`, `"ganha"` → `"fechado"`, `"perdida"` → `"perdido"`
- `"agendada"` → `"reuniao_agendada"`, `"no_show"` → remover ou tratar

#### `src/components/forecast/ForecastTable.tsx` (linhas 50-54)
- `ganha` → `fechado`, `perdida` → `perdido`

#### `src/hooks/useCloserMeetings.ts` (linha 11)
- `"manager"` → `"gestor"`

#### `src/hooks/useAuth.tsx`
- `AppRole` type → adicionar `"gestor"` e `"analista_processos"`
- `profileData.cargo as AppRole` — o mapping is correct

#### `src/components/vendas/VendasTable.tsx` (linha 203)
- `outcome: "ganha"` → já sends to edge function; edge function mapping handles it

#### `src/components/pre-venda/MeetingsTable.tsx`
- `fonte_lead` references → uses compat layer, OK but fragile

#### `src/hooks/useCloserAvailability.ts`
- Check for old status references

---

### Parte 3: Type Updates

#### `src/hooks/useAuth.tsx`
- `AppRole` type: add `"gestor" | "analista_processos"` 
- Check all `"manager"` references → `"gestor"`

---

### Resumo de Arquivos a Alterar

| # | Arquivo | Mudanças |
|---|---------|----------|
| 1 | `supabase/functions/manage-users/index.ts` | `profiles`→`core_users`, remove `user_roles`, `role`→`cargo` |
| 2 | `supabase/functions/generate-followup-steps/index.ts` | `meetings`→`crm_meetings`, `followup_steps`→`crm_followup_steps`, field renames |
| 3 | `supabase/functions/reschedule-followup/index.ts` | Same table+field renames |
| 4 | `supabase/functions/send-meeting-reminders/index.ts` | Table renames, `agendada`→`reuniao_agendada`, `notifications`→`core_notifications` |
| 5 | `supabase/functions/generate-wbr-report/index.ts` | All table renames, all status renames, all field renames |
| 6 | `supabase/functions/migrate-existing-leads/index.ts` | `user_roles`→`core_users`, table+field renames |
| 7 | `supabase/functions/set-deal-outcome/index.ts` | Table renames, `ganha`→`fechado`, `perdida`→`perdido`, field renames |
| 8 | `src/hooks/useAuth.tsx` | Add `gestor`, `analista_processos` to AppRole |
| 9 | `src/hooks/useCloserMeetings.ts` | `"manager"`→`"gestor"` |
| 10 | `src/pages/Users.tsx` | `"manager"`→`"gestor"` |
| 11 | `src/pages/Meetings.tsx` | `"agendada"`→`"reuniao_agendada"`, `"perdida"`→`"perdido"` |
| 12 | `src/pages/Proposals.tsx` | `"ganha"`→`"fechado"`, `"perdida"`→`"perdido"` |
| 13 | `src/components/pre-venda/CloserDayAgenda.tsx` | Status renames |
| 14 | `src/components/forecast/ForecastTable.tsx` | `ganha`→`fechado`, `perdida`→`perdido` |
| 15 | `src/components/vendas/VendasTable.tsx` | `"ganha"`→`"fechado"` in edge function call |

