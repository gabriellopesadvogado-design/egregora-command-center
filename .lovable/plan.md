

## Refazer página /leads — Porta de entrada do funil comercial

### Resumo

Reescrever completamente a página `/leads` e seus componentes para consultar diretamente a tabela `crm_leads` (em vez de derivar leads de `crm_meetings`), com status calculado via LEFT JOIN com `crm_meetings`, filtros dedicados, modais de criação de lead/reunião/não-elegível, e detalhes.

### Arquivos a criar/reescrever

| # | Arquivo | Ação |
|---|---------|------|
| 1 | `src/hooks/useLeadsPage.ts` | **Novo** — hook principal da página |
| 2 | `src/pages/Leads.tsx` | **Reescrever** — nova estrutura completa |
| 3 | `src/components/leads/LeadsTable.tsx` | **Reescrever** — novas colunas e ações |
| 4 | `src/components/leads/NewLeadModal.tsx` | **Novo** — modal de cadastro de lead |
| 5 | `src/components/leads/CreateMeetingModal.tsx` | **Novo** — modal "Criar Reunião" |
| 6 | `src/components/leads/MarkNotEligibleModal.tsx` | **Novo** — modal "Não Elegível" |
| 7 | `src/components/leads/LeadDetailsModal.tsx` | **Novo** — modal de detalhes read-only |
| 8 | `src/hooks/useLeads.ts` | **Reescrever** — INSERT de lead com RLS-safe mutation |

### Arquitetura do hook principal (`useLeadsPage.ts`)

Query `crm_leads` com paginação server-side (range 0-24, 25-49, etc.), filtros via `.ilike()` e `.eq()`. Para cada lead, faz uma segunda query (ou batch) em `crm_meetings` para determinar o status do pipeline:

```text
1. Fetch crm_leads (filtered, paginated, ordered)
2. Fetch crm_meetings WHERE lead_id IN (lead_ids) — single query
3. Map cada lead → status:
   - Nenhum meeting → "Sem reunião"
   - Algum meeting com status='fechado' → "Fechado"
   - Algum meeting com status='perdido' → "Perdido"
   - Algum meeting com status='nao_elegivel' → "Não elegível"
   - Outro → "Em pipeline"
4. Calcular contagem "leads sem reunião" (total, não paginado)
```

Retorna: `{ leads, totalCount, noMeetingCount, isLoading }`.

### Filtros

- **Origem**: `crm_leads.origem` — `.eq("origem", value)`
- **Canal**: `crm_leads.canal` — `.eq("canal", value)`
- **Tipo de interesse**: `crm_leads.tipo_interesse` — `.eq("tipo_interesse", value)`
- **Período**: filtra `crm_leads.created_at` com `gte`/`lte`
- **SDR** (admin/gestor only): filtra meetings por `sdr_id` — client-side filter após join
- **Busca texto**: `.or("nome.ilike.%term%,telefone.ilike.%term%,whatsapp.ilike.%term%")`

### Tabela (LeadsTable)

Colunas: Nome | WhatsApp | Origem | Canal | Tipo de Interesse | Entrada | Status | Ações

- **Entrada**: `formatDistanceToNow` se hoje, senão `format(dd MMM yyyy)`
- **Status**: badge colorida (vermelho "Sem reunião", azul "Em pipeline", verde "Fechado", cinza "Perdido"/"Não elegível")
- **Ações**:
  - "Criar Reunião" (botão primário) — só se status = "Sem reunião"
  - "Não Elegível" (botão outline) — só se status = "Sem reunião"
  - "Ver detalhes" (ícone olho) — sempre

Suporta ordenação por coluna clicando no header.

### Modal "Novo Lead" (NewLeadModal)

Formulário: Nome*, WhatsApp*, Email, Telefone, Origem, Canal, Nacionalidade, País de residência, Tipo de interesse.
INSERT em `crm_leads`. Invalidar queries.

### Modal "Criar Reunião" (CreateMeetingModal)

Props: lead (objeto completo). Campos: Closer, SDR (pré-seleciona user logado se SDR), Tipo de serviço, Data da reunião (opcional), Notas.
INSERT em `crm_meetings` com dados do lead copiados. Status = `novo_lead`. Invalidar queries.

### Modal "Não Elegível" (MarkNotEligibleModal)

Props: lead. Campo: motivo (texto). INSERT em `crm_meetings` com status = `nao_elegivel`, sdr_id = user logado, notas = motivo. Invalidar queries.

### Modal "Ver Detalhes" (LeadDetailsModal)

Exibe todos os campos do lead (read-only) + meeting vinculada se existir (status, closer, SDR, data, notas).

### Permissões

- **Closer**: vê tudo, sem botões de ação (sem "Criar Reunião" nem "Não Elegível")
- **SDR**: vê tudo, tem ações, sem filtro por SDR
- **Admin/Gestor**: vê tudo, tem ações, tem filtro por SDR

### RLS

`crm_leads` já tem SELECT para authenticated. Precisa de **INSERT policy** para permitir criação de leads:

```sql
CREATE POLICY "Authenticated can insert leads"
ON public.crm_leads FOR INSERT TO authenticated
WITH CHECK (true);
```

`crm_meetings` já tem ALL policy com `closer_id = auth.uid() OR sdr_id = auth.uid() OR is_admin()`. O INSERT do meeting vai setar `sdr_id` ou `closer_id` ao user logado, então passa pela policy.

### Paginação

25 por página, server-side com `.range()`. Componente de paginação simples (Anterior/Próxima + indicador de página).

### Migração SQL necessária

1. INSERT policy em `crm_leads` para authenticated users

