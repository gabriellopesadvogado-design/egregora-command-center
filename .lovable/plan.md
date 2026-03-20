

## Integração Pipeline ↔ Pré-Venda ↔ Vendas

### Summary

Centralizar mudanças de status via hook `useStatusTransition`, criar 4 modais de transição obrigatória, adicionar Supabase Realtime, e reescrever /pre-venda e /vendas para refletirem a spec.

### Files to Create/Edit

| # | File | Action |
|---|------|--------|
| 1 | `src/hooks/useStatusTransition.tsx` | **New** — hook + context provider with modal state machine |
| 2 | `src/components/shared/AgendarReuniaoModal.tsx` | **New** — modal reuniao_agendada |
| 3 | `src/components/shared/ReuniaoRealizadaModal.tsx` | **New** — modal reuniao_realizada |
| 4 | `src/components/shared/PropostaEnviadaModal.tsx` | **New** — modal proposta_enviada |
| 5 | `src/components/shared/ContratoEnviadoModal.tsx` | **New** — modal contrato_enviado |
| 6 | `src/hooks/useMeetings.ts` | **Edit** — add Realtime subscription |
| 7 | `src/components/pipeline/KanbanBoard.tsx` | **Edit** — use useStatusTransition instead of inline modal logic |
| 8 | `src/pages/PreVenda.tsx` | **Rewrite** — new layout per spec |
| 9 | `src/components/pre-venda/PreVendaTable.tsx` | **New** — replace MeetingsTable with spec-compliant table |
| 10 | `src/components/pre-venda/PreVendaQuickAdd.tsx` | **New** — inline quick-add row |
| 11 | `src/pages/Vendas.tsx` | **Rewrite** — new filters and layout per spec |
| 12 | `src/components/vendas/VendasTable.tsx` | **Rewrite** — use useStatusTransition, contextual actions per status |
| 13 | `src/App.tsx` | **Edit** — wrap routes with StatusTransitionProvider |

### Architecture: useStatusTransition

```text
StatusTransitionProvider (wraps AppLayout)
  └─ Context provides: requestStatusChange(meeting, newStatus)
  └─ Renders all 6 modals (hidden until triggered):
       AgendarReuniaoModal, ReuniaoRealizadaModal, PropostaEnviadaModal,
       ContratoEnviadoModal, FechamentoModal, MotivoPerdaModal
  └─ For non-modal statuses: direct UPDATE via useUpdateMeeting
```

**Hook API:**
```typescript
const { requestStatusChange } = useStatusTransition();
// Returns a Promise<boolean> — true if status changed, false if cancelled
await requestStatusChange(meeting, "reuniao_agendada");
```

**Transitions requiring modals:**
- `reuniao_agendada` → AgendarReuniaoModal (date+time, closer, SDR, tipo_servico, obs)
- `reuniao_realizada` → ReuniaoRealizadaModal (confirmation + optional note → INSERT crm_notas)
- `proposta_enviada` → PropostaEnviadaModal (valor_proposta, data_proposta, obs)
- `contrato_enviado` → ContratoEnviadoModal (valor confirmado, data envio)
- `fechado` → FechamentoModal (existing)
- `perdido` → MotivoPerdaModal (existing)

All other transitions (novo_lead→qualificado, qualificado→elegivel, etc.) → direct UPDATE.

### Realtime (Rule 5)

Add to `useMeetings` hook:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('crm_meetings_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_meetings' },
      () => queryClient.invalidateQueries({ queryKey: ["meetings"] })
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

### /pre-venda Rewrite

**Header:** "Pré-Venda" + "Agenda de {data formatada}". CloserDayAgenda component stays (already queries by date).

**Filters:** Period (Hoje/Semana/Mês), closer dropdown (admin/gestor only; closer pre-filtered), search.

**Table query:** `crm_meetings WHERE status IN ('reuniao_agendada','reuniao_realizada','proposta_enviada') AND data_reuniao IS NOT NULL`.

**Columns:** Horário, Lead, Telefone (tel: link), Data, Fonte (via lead_id→crm_leads.origem), Status badge, Closer, SDR, Ações.

**Actions per status:**
- `reuniao_agendada`: "Marcar como Realizada" (→ ReuniaoRealizadaModal), "Adicionar Observação" (quick INSERT crm_notas)
- `reuniao_realizada`: "Enviar Proposta" (→ PropostaEnviadaModal)
- Always: "Ver Detalhes" (→ DealDetailPanel)

**QuickAdd row:** inline fields for time, name, phone, date, fonte, closer, SDR(auto), obs. INSERT crm_meetings + crm_leads.

### /vendas Rewrite

**Query:** `crm_meetings WHERE status NOT IN ('nao_elegivel','novo_lead','qualificado','elegivel')`.

**Status dropdown editable** in each row — uses `requestStatusChange()` so same modals apply.

**Contextual actions per status:**
- `proposta_enviada`/`followup_ativo`/`contrato_enviado`: "Ganhar"→FechamentoModal, "Perder"→MotivoPerdaModal, show valor/aging/FU count
- `reuniao_agendada`: "Marcar como Realizada"
- `reuniao_realizada`: "Enviar Proposta"

**DealDetailPanel:** reuse existing component on lead click.

### KanbanBoard Changes

Replace inline modal state + handleDrop logic with:
```typescript
const { requestStatusChange } = useStatusTransition();
const handleDrop = (meetingId, newStatus) => {
  const meeting = meetings.find(m => m.id === meetingId);
  if (meeting) requestStatusChange(meeting, newStatus);
};
```
Remove FechamentoModal/MotivoPerdaModal renders from KanbanBoard (now in provider).

### Modal Details

**AgendarReuniaoModal:** Query `core_users` for closers (cargo IN closer/admin, ativo=true) and SDRs (cargo=sdr, ativo=true). Date+time picker. On confirm: UPDATE meeting with status, data_reuniao, closer_id, sdr_id, tipo_servico.

**ReuniaoRealizadaModal:** Simple confirmation + optional textarea. On confirm: UPDATE status. If obs provided: INSERT crm_notas (tipo='reuniao').

**PropostaEnviadaModal:** Numeric valor, date picker (default today). On confirm: UPDATE status + valor_proposta + data_proposta. Then call `generate-followup-steps` edge function.

**ContratoEnviadoModal:** Valor (pre-filled from valor_proposta), date picker. On confirm: UPDATE status.

### No DB changes needed

All tables exist. RLS already supports the operations needed. The `core_users` SELECT policy requires `auth.uid() = id OR is_admin()` — this will be handled by using `useAllProfiles()` which already works for populating dropdowns.

