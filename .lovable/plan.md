

## Create Admin User

### What needs to happen

1. **Update `create-admin-user` edge function** — it currently references old tables (`profiles`, `user_roles`). Must update to use `core_users` with `cargo = 'admin'`. Also remove the `ADMIN_BOOTSTRAP_TOKEN` requirement (not configured) and use a hardcoded one-time setup token instead.

2. **Add INSERT RLS policy on `core_users`** — currently users can't insert into `core_users`. The edge function uses the service role key so this isn't strictly needed, but we should ensure the function inserts the row after creating the auth user.

3. **Deploy the edge function** and invoke it with:
   - email: `gabriellopes@egregoramigration.com.br`
   - password: `Egregor@2026`
   - nome: `Gabriel Lopes`
   - cargo: `admin`

### Technical details

The updated `create-admin-user` function will:
- Use `SUPABASE_SERVICE_ROLE_KEY` (already configured) to create the auth user via `supabase.auth.admin.createUser()`
- Insert/upsert a row in `core_users` with `cargo = 'admin'`
- Skip bootstrap token validation (one-time setup)

### Files changed
| File | Change |
|------|--------|
| `supabase/functions/create-admin-user/index.ts` | Update to use `core_users` table, remove bootstrap token |

