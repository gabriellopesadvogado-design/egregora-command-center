

## Diagnóstico do erro 403 em `set-deal-outcome`

### Causa raiz

O edge function verifica permissão assim (linha 76):
```
if (!isAdminManager && meeting.closer_id !== userId) → 403
```

Mas a meeting criada pelo "Novo Lead" no Pipeline **não tem `closer_id` definido** (é `null`). E o RLS da tabela `crm_meetings` permite acesso por `closer_id`, `sdr_id`, ou admin/gestor — mas o edge function só verifica `closer_id`, ignorando `sdr_id`.

### Correção

**Arquivo:** `supabase/functions/set-deal-outcome/index.ts`

1. **Buscar também `sdr_id`** na query do meeting (linha 61): adicionar `sdr_id` ao select
2. **Expandir a verificação de permissão** (linha 76): permitir acesso se o usuário for o `closer_id` OU o `sdr_id`, alinhando com a política RLS existente

```typescript
// Linha 61: adicionar sdr_id ao select
.select("id, closer_id, sdr_id, data_reuniao")

// Linha 76: expandir check
if (!isAdminManager && meeting.closer_id !== userId && meeting.sdr_id !== userId) {
```

3. **Re-deploy** da edge function

### Detalhes técnicos

A política RLS da tabela `crm_meetings` é:
```sql
(closer_id = auth.uid()) OR (sdr_id = auth.uid()) OR is_admin_or_gestor(auth.uid())
```

O edge function deve espelhar essa mesma lógica. Sem isso, qualquer meeting sem `closer_id` (ou onde o usuário logado é o SDR) resulta em 403.

