

## Rebuild /pipeline as CRM Meetings Kanban + Reusable Loss Modal

### Summary

Complete rewrite of the Pipeline page from a proposal-based Kanban (4 columns on `crm_proposals`) to a meetings-based Kanban (10 columns on `crm_meetings`), with deal detail slide-over panel, win/loss modals, and a reusable `MotivoPerdaModal` component used across all pages.

### RLS Prerequisite

`crm_meetings` currently has an ALL policy requiring `closer_id = auth.uid() OR sdr_id = auth.uid() OR is_admin()`. This blocks updates by gestores who aren't the closer/sdr. Need an UPDATE policy that also allows gestores.

**SQL Migration:**
```sql
-- Allow gestores to update meetings (they need to move cards in Kanban)
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.core_users
    WHERE id = _user_id AND cargo IN ('admin', 'gestor')
  )
$$;

-- Replace existing policy to include gestores
DROP POLICY IF EXISTS "Meetings by role" ON public.crm_meetings;
CREATE POLICY "Meetings by role" ON public.crm_meetings
FOR ALL TO authenticated
USING (closer_id = auth.uid() OR sdr_id = auth.uid() OR is_admin_or_gestor(auth.uid()))
WITH CHECK (closer_id = auth.uid() OR sdr_id = auth.uid() OR is_admin_or_gestor(auth.uid()));
```

### Files to Create/Rewrite

| # | File | Action |
|---|------|--------|
| 1 | `src/components/shared/MotivoPerdaModal.tsx` | **New** — reusable loss modal with dropdown motivos |
| 2 | `src/components/pipeline/DealCard.tsx` | **New** — card for meetings in Kanban |
| 3 | `src/components/pipeline/DealDetailPanel.tsx` | **New** — slide-over panel with deal details, followups, proposals, notes |
| 4 | `src/components/pipeline/FechamentoModal.tsx` | **New** — win modal with valor + date |
| 5 | `src/components/pipeline/KanbanColumn.tsx` | **Rewrite** PipelineColumn for meetings |
| 6 | `src/components/pipeline/KanbanBoard.tsx` | **Rewrite** PipelineBoard for meetings |
| 7 | `src/components/pipeline/KanbanFilters.tsx` | **Rewrite** PipelineFilters for meetings |
| 8 | `src/pages/Pipeline.tsx` | **Rewrite** — use meetings hook |
| 9 | `src/components/vendas/VendasTable.tsx` | **Edit** — replace VendasLossModal with MotivoPerdaModal |

### Architecture

#### Pipeline Data Flow

```text
Pipeline.tsx
  └─ useMeetings({ closerId, sdrId, searchTerm }) → all meetings
  └─ useQuery("followup-today", ...) → set of meeting_ids with pending followup today
  └─ KanbanFilters (role-aware: closer sees own, admin/gestor sees all)
  └─ KanbanBoard
       └─ 10 × KanbanColumn (one per crm_status, excluding nao_elegivel)
            └─ DealCard (drag source)
       └─ FechamentoModal (on drop to "fechado")
       └─ MotivoPerdaModal (on drop to "perdido")
       └─ DealDetailPanel (on card click, Sheet slide-over)
```

#### 10 Kanban Columns

```text
Status              Title                  Color (border-t)
novo_lead           Novo Lead              gray (border-t-slate-300)
qualificado         Qualificado            sky (border-t-sky-300)
elegivel            Elegível               blue (border-t-blue-400)
reuniao_agendada    Reunião Agendada       yellow (border-t-yellow-400)
reuniao_realizada   Reunião Realizada      orange (border-t-orange-400)
proposta_enviada    Proposta Enviada       purple (border-t-purple-400)
followup_ativo      Follow-up Ativo        indigo (border-t-indigo-500)
contrato_enviado    Contrato Enviado       emerald (border-t-emerald-300)
fechado             Fechado                green (border-t-green-500)
perdido             Perdido                red (border-t-red-500)
```

Each column header shows: title, count badge, sum of `valor_proposta` in BRL.

#### DealCard

Shows: `nome_lead` (bold), `valor_proposta` formatted, closer/sdr name, "há X dias" badge (green/yellow/red based on `updated_at` age), small icon if followup pending today.

#### Drag & Drop

- Standard drag: `UPDATE crm_meetings SET status = newStatus WHERE id = meetingId` via `useUpdateMeeting`
- Drop on "fechado" → open `FechamentoModal` (valor_fechamento*, data_fechamento*)
- Drop on "perdido" → open `MotivoPerdaModal` (motivo required)
- Cancel either modal → card stays in original column (no update)

#### MotivoPerdaModal (Reusable)

```typescript
interface MotivoPerdaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, observacao: string) => void;
  isLoading?: boolean;
}
```

Dropdown with 11 predefined motivos (Não possui orçamento, Não respondeu proposta, etc.), optional text field for observação. Used in:
- Pipeline Kanban (drop to perdido)
- VendasTable (replace VendasLossModal usage — adapt handleLoss to use new modal interface)

#### DealDetailPanel (Sheet/Slide-over)

Uses `shadcn/ui Sheet` (side="right"). Sections:
1. **Lead data** — nome, email, telefone (tel: link), whatsapp (wa.me link), nacionalidade, tipo_servico
2. **Deal data** — status, valor_proposta, valor_fechamento, closer, SDR, dates, motivo_perda
3. **Edit button** — inline form to edit deal fields
4. **Follow-ups** — query `crm_followup_steps WHERE meeting_id`, table with step_nome, data_programada, status. "Marcar como Enviado" button on pending steps
5. **Proposals** — query `crm_proposals WHERE meeting_id`
6. **Notes** — editable textarea for `crm_meetings.notas`
7. **HubSpot link** — if `hubspot_deal_id` exists

#### FechamentoModal

Fields: valor_fechamento (number, pre-filled from valor_proposta), data_fechamento (date picker, default today). On confirm: updates meeting with status=fechado + financial data.

#### KanbanFilters

- Search by lead name (debounced)
- Dropdown "Responsável" with all core_users
  - Auto-filters by role: closer sees own `closer_id`, SDR sees own `sdr_id`, admin/gestor sees all
- Horizontal scroll container for 10 columns on desktop

#### Mobile

On mobile: use Tabs component with scrollable tab list (same as current pattern).

### Integration with VendasTable

Replace `VendasLossModal` usage in `VendasTable.tsx`:
- Import `MotivoPerdaModal` instead
- Adapt `handleLoss` to receive `(motivo: string, observacao: string)` and call `set-deal-outcome` edge function with `{ outcome: "perdido", motivo, observacao }`

### Files Summary

| File | What changes |
|------|-------------|
| `src/pages/Pipeline.tsx` | Complete rewrite — uses `useMeetings`, new components |
| `src/components/pipeline/KanbanBoard.tsx` | New — 10 columns, drag/drop, modals |
| `src/components/pipeline/KanbanColumn.tsx` | New — column with drop zone |
| `src/components/pipeline/KanbanFilters.tsx` | New — role-aware filters |
| `src/components/pipeline/DealCard.tsx` | New — meeting card |
| `src/components/pipeline/DealDetailPanel.tsx` | New — Sheet slide-over |
| `src/components/pipeline/FechamentoModal.tsx` | New — win modal |
| `src/components/shared/MotivoPerdaModal.tsx` | New — reusable loss modal |
| `src/components/vendas/VendasTable.tsx` | Edit — use MotivoPerdaModal |
| SQL migration | `is_admin_or_gestor` function + update RLS policy |
| Old files to delete | `PipelineBoard.tsx`, `PipelineColumn.tsx`, `ProposalCard.tsx`, `WinModal.tsx`, `LossModal.tsx`, `PipelineFilters.tsx` (replaced by new files) |

