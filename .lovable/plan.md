

## Fix: Pipeline não visível

O Pipeline existe como página (`src/pages/Pipeline.tsx`) mas falta em dois lugares:

### 1. Adicionar rota em `App.tsx`

Adicionar `import Pipeline from "./pages/Pipeline"` e a rota `<Route path="/pipeline" element={<Pipeline />} />` dentro do `AppLayout`.

### 2. Adicionar link no Sidebar

Adicionar entrada `{ name: "Pipeline", href: "/pipeline", icon: Kanban, roles: ["admin", "gestor", "sdr", "closer"] }` no array `navigation` do Sidebar, importando o ícone `Kanban` do lucide-react. Posicionar logo após "Leads" na lista.

### Arquivos a alterar

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Import Pipeline + adicionar rota `/pipeline` |
| `src/components/layout/Sidebar.tsx` | Adicionar item "Pipeline" com ícone Kanban |

