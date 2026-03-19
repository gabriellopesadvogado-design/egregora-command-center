

## Fix Remaining TypeScript Errors — Component Layer

All errors stem from components using old field/enum names that no longer match the new `egregora-command-center` schema. The hooks layer was updated, but components still reference legacy values.

### Root Causes & Fixes

**1. Enum type references from DB (3 files)**
`ForecastFilters.tsx` and `ReliabilityFilters.tsx` reference `Database["public"]["Enums"]["meeting_status"]`, `avaliacao_reuniao`, `plataforma_origem` — these don't exist. The DB enum is `crm_status`. Fix: use local string type aliases (already defined in hooks).

- `src/components/forecast/ForecastFilters.tsx` — lines 26-28: replace with local types from hooks
- `src/components/forecast/ReliabilityFilters.tsx` — lines 21-22: same fix

**2. `role` → `cargo` (2 files)**
`ForecastOverviewTab.tsx` and `ReliabilityTab.tsx` filter `u.role` but `core_users` has `cargo`.

**3. StatusToggle — old status values (1 file)**
`StatusToggle.tsx` uses `agendada`, `aconteceu`, `no_show`, `cancelada`, `ganha`, `perdida`. Must map to new `crm_status` enum: `reuniao_agendada`, `reuniao_realizada`, `nao_elegivel`, `perdido`, `fechado`, `proposta_enviada`, `qualificado`, etc.

**4. LeadsTable + ExportLeadsCsvButton — old status Records (2 files)**
Same old status keys in `Record<MeetingStatus, ...>`. Update keys to `crm_status` values.

**5. Pipeline components — wrong Proposal fields (3 files)**
`ProposalCard`, `PipelineColumn`, `PipelineBoard` reference `valor_proposto`, `valor_fechado`, `motivo_perda`, `closer`, `fechado_em`, `caixa_gerado`. The `crm_proposals` table has `valor` (not `valor_proposto`), and lacks `valor_fechado`/`motivo_perda`/`caixa_gerado`/`fechado_em`. Fix: map `valor` in the Proposal type, remove references to non-existent fields or add them to the type as optional enrichment.

**6. CanceledMeetingsTable — old field names (1 file)**
References `inicio_em` → `data_reuniao`, `fonte_lead` → `origem` (from lead), `observacao` → `notas`, `leads?.plataforma_origem` → `leads?.origem`.

**7. NotificationDropdown — `enviado_em` → `created_at` (1 file)**

**8. MeetingsTable — old status comparisons + field names (1 file)**
`"aconteceu"` → `"reuniao_realizada"`, `"agendada"` → `"reuniao_agendada"`, `inicio_em` → `data_reuniao`.

**9. VendasTable — old status values + field names (1 file)**
Same pattern: old status strings and `inicio_em`/`fonte_lead`/`observacao` references.

**10. Calendar.tsx — `IconLeft`/`IconRight` deprecated (1 file)**
Newer `react-day-picker` uses different component names. Fix by updating to current API.

**11. Chart.tsx — `payload`/`label` type errors (1 file)**
Recharts tooltip type mismatch. Fix with type assertion.

### Files to modify (16 total)

| File | Changes |
|------|---------|
| `src/components/forecast/ForecastFilters.tsx` | Local type aliases, fix STATUS_OPTIONS values |
| `src/components/forecast/ReliabilityFilters.tsx` | Local type aliases |
| `src/components/forecast/ForecastOverviewTab.tsx` | `role` → `cargo` |
| `src/components/forecast/ReliabilityTab.tsx` | `role` → `cargo` |
| `src/components/pre-venda/StatusToggle.tsx` | Rewrite statusConfig with new crm_status values |
| `src/components/pre-venda/MeetingsTable.tsx` | Old status → new, `inicio_em` → `data_reuniao` |
| `src/components/leads/LeadsTable.tsx` | Update statusConfig keys |
| `src/components/leads/ExportLeadsCsvButton.tsx` | Update statusLabels keys |
| `src/components/pipeline/ProposalCard.tsx` | `valor_proposto` → `valor`, remove `valor_fechado`/`motivo_perda`/`closer` |
| `src/components/pipeline/PipelineColumn.tsx` | `valor_proposto` → `valor` |
| `src/components/pipeline/PipelineBoard.tsx` | Remove `valor_fechado`/`caixa_gerado`/`fechado_em`/`motivo_perda` from update calls |
| `src/components/meetings/CanceledMeetingsTable.tsx` | `inicio_em` → `data_reuniao`, field fixes |
| `src/components/notifications/NotificationDropdown.tsx` | `enviado_em` → `created_at` |
| `src/components/vendas/VendasTable.tsx` | Old status/field names → new |
| `src/components/ui/calendar.tsx` | Fix `IconLeft`/`IconRight` for newer react-day-picker |
| `src/components/ui/chart.tsx` | Type assertion for payload/label |

### Status mapping reference

| Old value | New crm_status value |
|-----------|---------------------|
| agendada | reuniao_agendada |
| aconteceu | reuniao_realizada |
| proposta_enviada | proposta_enviada |
| ganha | fechado |
| perdida | perdido |
| no_show | nao_elegivel |
| cancelada | nao_elegivel |

