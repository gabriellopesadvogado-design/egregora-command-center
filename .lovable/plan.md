

## Adicionar botão "Novo Lead" na página /pipeline

Atualmente a página `/pipeline` não possui funcionalidade para criar leads diretamente. Para criar "Ana Clara" e permitir criação futura de leads pelo Kanban, será necessário adicionar um botão + modal.

### Arquivos

| # | Arquivo | Ação |
|---|---------|------|
| 1 | `src/components/pipeline/NewLeadKanbanModal.tsx` | **Novo** — modal simples com campo nome (obrigatório), telefone, email, observação |
| 2 | `src/pages/Pipeline.tsx` | **Editar** — adicionar botão "Novo Lead" no header que abre o modal |

### Detalhes

**Modal NewLeadKanbanModal:**
- Campos: Nome* (obrigatório), Telefone, Email, Observação
- Ao confirmar: `useCreateMeeting()` com `{ nome_lead: nome, telefone_lead, email_lead, status: 'novo_lead', notas }` 
- Toast de sucesso: "Lead {nome} criado com sucesso!"
- O novo lead aparece automaticamente na coluna "Novo Lead" do Kanban (Realtime já está ativo)

**Pipeline.tsx:**
- Adicionar botão `<Button>` com ícone `Plus` ao lado do título "Pipeline"
- State `newLeadOpen` para controlar o modal

Após implementar, o lead "Ana Clara" poderá ser criado diretamente pelo botão.

