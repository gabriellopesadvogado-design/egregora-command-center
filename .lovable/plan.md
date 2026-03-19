

## Fix Remaining Build Errors

7 files need fixes across 5 categories.

### 1. `src/components/ui/resizable.tsx` — Wrong imports
The installed `react-resizable-panels` package uses `*` namespace import, not named exports `Panel`/`PanelGroup`/`PanelResizeHandle`. Switch to `import * as ResizablePrimitive from "react-resizable-panels"` and use `ResizablePrimitive.Panel`, etc.

### 2. `src/components/users/CreateUserModal.tsx` — Zod schema vs type mismatch
The Zod schema defines `role: z.string()` but `CreateUserFormData` has `role: "sdr" | "closer"`. Fix: use `z.enum(["sdr", "closer"])` in the schema and remove the separate interface — use `z.infer` instead.

### 3. `src/components/users/EditUserModal.tsx` — `role` type mismatch (line 66)
`useUpdateUserRole` expects `role: "sdr" | "closer"` but `data.cargo` is `string`. Fix: update `UpdateRoleData` in `useUsers.ts` to accept `string` for `role`, or cast in the modal. Also update the Zod schema to use `z.enum`.

### 4. `src/pages/Meetings.tsx` + `src/pages/Proposals.tsx` — `u.role` → `u.cargo`
Lines 56-57 and 61-62 respectively filter users by `u.role`. Change to `u.cargo`.

### 5. `src/pages/Notificacoes.tsx` — `enviado_em` → `created_at`
Lines 132 and 134 reference `notification.enviado_em`. Change to `notification.created_at`.

### 6. `src/pages/PropostaEnvio.tsx` — `proposal_documents` table doesn't exist
The query references a `proposal_documents` table that doesn't exist in the schema. Remove the saved PDF badge query entirely (or replace with a simple placeholder). The `statusLabels` also use old values — update to match `crm_proposals.status` values (`rascunho`, `enviada`, `aceita`, `recusada`).

### 7. `src/hooks/useUsers.ts` — Widen `UpdateRoleData.role` type
Change from `"sdr" | "closer"` to `string` so it accepts any cargo value from the DB.

### Files changed (7)
| File | Fix |
|------|-----|
| `src/components/ui/resizable.tsx` | Use `* as ResizablePrimitive` import |
| `src/components/users/CreateUserModal.tsx` | Use `z.enum` + `z.infer` |
| `src/components/users/EditUserModal.tsx` | Use `z.enum` for cargo |
| `src/hooks/useUsers.ts` | Widen `role` type to `string` |
| `src/pages/Meetings.tsx` | `role` → `cargo` |
| `src/pages/Proposals.tsx` | `role` → `cargo` |
| `src/pages/Notificacoes.tsx` | `enviado_em` → `created_at` |
| `src/pages/PropostaEnvio.tsx` | Remove `proposal_documents` query, update status labels |

