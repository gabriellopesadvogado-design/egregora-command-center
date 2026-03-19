

## Sistema de Notas e Atividades por Deal

### Descoberta

A tabela `crm_notas` **não existe** no banco. Será criada via migração SQL. Também não está no `types.ts` (será regenerado automaticamente após a migração).

### Migração SQL

```sql
CREATE TABLE public.crm_notas (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.crm_meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'nota',
  sincronizado_hubspot boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_notas ENABLE ROW LEVEL SECURITY;

-- Authenticated can read notes for meetings they have access to
CREATE POLICY "Read notes" ON public.crm_notas
FOR SELECT TO authenticated USING (true);

-- Authenticated can insert notes
CREATE POLICY "Insert notes" ON public.crm_notas
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE policies (immutable activity log)
```

### Arquivos

| # | Arquivo | Ação |
|---|---------|------|
| 1 | `src/components/shared/NotasAtividades.tsx` | **Novo** — componente reutilizável |
| 2 | `src/components/pipeline/DealDetailPanel.tsx` | **Editar** — substituir seção "Notas" pelo componente |
| 3 | SQL migration | Criar tabela + RLS |

### Componente NotasAtividades

**Props**: `meetingId: string`

**Query**: `supabase.from("crm_notas").select("*, core_users!user_id(nome, cargo)").eq("meeting_id", meetingId).order("created_at", { ascending: false })`

Note: Como `crm_notas` não está no types.ts gerado, usaremos cast `.from("crm_notas" as any)` até a próxima regeneração de tipos, ou definiremos a interface manualmente.

**Layout**:
- Formulário no topo: textarea (3 linhas) + dropdown tipo (nota/ligacao/email/whatsapp/reuniao) + botão Salvar
- Timeline abaixo: cada nota com ícone por tipo, conteúdo (whitespace-pre-wrap), autor "Nome (cargo)", data formatada, badge "Sincronizado" se aplicável
- Estado vazio: "Nenhuma nota registrada"

**INSERT**: `crm_notas` com `meeting_id`, `user_id` do auth, `conteudo`, `tipo`. Invalidar query após sucesso.

### Integração no DealDetailPanel

Substituir a seção "Notas" (linhas 250-264) que usa `crm_meetings.notas` como textarea editável por `<NotasAtividades meetingId={meeting.id} />`. Posicionar entre Follow-ups/Propostas e o link HubSpot.

### Integração em outras páginas

As páginas /vendas, /pre-venda e /followup não possuem painéis de detalhe com meeting_id atualmente expostos como slide-over. A integração nessas páginas será feita quando esses painéis forem construídos. Por enquanto, o componente fica disponível e é usado no Pipeline.

### Ícones por tipo

- `nota` → FileText
- `ligacao` → Phone
- `email` → Mail
- `whatsapp` → MessageCircle (verde)
- `reuniao` → Calendar

