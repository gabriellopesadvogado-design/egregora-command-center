

## Página /reativacao — Funil de Reativação

### Descoberta

As tabelas `crm_motivos_perda` e `crm_reativacoes` **não existem** no banco. Serão criadas via migração SQL.

### Migração SQL

```sql
-- Motivos de perda com regras de reativação
CREATE TABLE public.crm_motivos_perda (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  motivo text NOT NULL UNIQUE,
  reativavel boolean NOT NULL DEFAULT true,
  dias_minimos_reativacao integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_motivos_perda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read motivos" ON public.crm_motivos_perda FOR SELECT TO authenticated USING (true);

-- Seed dos 11 motivos
INSERT INTO public.crm_motivos_perda (motivo, reativavel, dias_minimos_reativacao) VALUES
  ('Não possui orçamento', true, 60),
  ('Não respondeu proposta', true, 30),
  ('Não assinou contrato', true, 30),
  ('Fechou com corrente', true, 90),
  ('Não consegui contato', true, 30),
  ('Não tem requisitos mínimos', false, 0),
  ('Não quis continuar com o processo', true, 60),
  ('Desqualificado (busca visto para outro país)', false, 0),
  ('Brasileiro', false, 0),
  ('Tem pedido de refúgio', false, 0),
  ('Outro', true, 90);

-- Reativações
CREATE TABLE public.crm_reativacoes (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.crm_meetings(id) ON DELETE CASCADE,
  motivo_perda_original text NOT NULL,
  data_perda timestamptz NOT NULL,
  data_reativacao timestamptz DEFAULT now(),
  faixa_reativacao text NOT NULL,
  responsavel_reativacao_id uuid NOT NULL,
  notas_reativacao text,
  resultado text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_reativacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read reativacoes" ON public.crm_reativacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert reativacoes" ON public.crm_reativacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update reativacoes" ON public.crm_reativacoes
  FOR UPDATE TO authenticated USING (is_admin_or_gestor(auth.uid()) OR responsavel_reativacao_id = auth.uid());
```

### Arquivos

| # | Arquivo | Ação |
|---|---------|------|
| 1 | SQL migration | Criar `crm_motivos_perda` + `crm_reativacoes` + seed + RLS |
| 2 | `src/pages/Reativacao.tsx` | **Novo** — página com abas Elegíveis/Histórico |
| 3 | `src/components/reativacao/ReativacaoElegiveis.tsx` | **Novo** — cards resumo + filtros + tabela de deals perdidos |
| 4 | `src/components/reativacao/ReativacaoHistorico.tsx` | **Novo** — tabela de reativações com botões de resultado |
| 5 | `src/components/reativacao/ReativacaoModal.tsx` | **Novo** — modal de reativação com faixa/responsável/notas |
| 6 | `src/App.tsx` | Adicionar rota `/reativacao` |
| 7 | `src/components/layout/Sidebar.tsx` | Adicionar "Reativação" com ícone `RefreshCw` entre Forecast e ROI |

### Arquitetura

#### ReativacaoElegiveis

- Queries: `crm_meetings WHERE status = 'perdido'`, `crm_motivos_perda`, `crm_reativacoes` (para checar se já existe em_andamento)
- 4 cards KPI: total perdidos, elegíveis, reativados mês, taxa conversão
- Filtros: motivo de perda, período, closer original, toggle "apenas elegíveis"
- Tabela com coluna "Elegível" (4 estados: verde/vermelho/amarelo/azul) e botão "Reativar" apenas se verde
- Cálculo de elegibilidade: `reativavel = true` E `dias >= dias_minimos` E sem reativação `em_andamento`

#### ReativacaoModal

- Props: `meeting` (deal perdido), `open`, `onClose`, `onSuccess`
- Auto-sugere faixa pela idade da perda (≤30d → closer, 31-60 → 60_dias_sdr, etc.)
- Dropdown responsável muda conforme faixa (closers vs SDRs)
- Ao confirmar: INSERT `crm_reativacoes` + UPDATE `crm_meetings` (status=novo_lead, limpa motivo_perda, seta closer/sdr, appenda notas)

#### ReativacaoHistorico

- Query: `crm_reativacoes` JOIN `crm_meetings` JOIN `core_users`
- Tabela com colunas: Lead, Motivo Original, Perdido em, Reativado em, Faixa, Responsável, Resultado (badge)
- Botões "Marcar como Fechado" / "Marcar como Perdido Novamente" para registros `em_andamento`

#### Sidebar

Inserir `{ name: "Reativação", href: "/reativacao", icon: RefreshCw, roles: ["admin", "gestor", "sdr"] }` entre Forecast e ROI por Canal.

