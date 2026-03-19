

## Fix: Sidebar Empty Due to Recursive RLS Policy on `core_users`

### Root Cause

The `core_users` table has an RLS policy that checks if the current user is admin by querying `core_users` itself — causing **infinite recursion** (Postgres error `42P17`). This makes the profile fetch in `useAuth` fail, so `role` is never set and the sidebar renders with zero navigation items.

Current broken policy:
```text
SELECT allowed when:
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM core_users WHERE id = auth.uid() AND cargo = 'admin')
                         ^^^^^^^^^^^ triggers same policy = infinite loop
```

### Fix

1. **Create a `SECURITY DEFINER` function** `is_admin(uuid)` that bypasses RLS to check if a user has `cargo = 'admin'` in `core_users` — same pattern as the `has_role` best practice.

2. **Replace the recursive RLS policy** on `core_users` with one that uses the new function:
   - Users can read their own row (`auth.uid() = id`)
   - Admins can read all rows (via `is_admin(auth.uid())`)

3. **Check other tables** (`crm_meetings`, `crm_proposals`, etc.) for the same recursive pattern and fix them too.

### SQL Migration

```sql
-- 1. Security definer function (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.core_users
    WHERE id = _user_id AND cargo = 'admin'
  )
$$;

-- 2. Drop the broken policy
DROP POLICY IF EXISTS "Users can read own data" ON public.core_users;

-- 3. Create fixed policy
CREATE POLICY "Users can read own data or admin reads all"
ON public.core_users FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));
```

### Files changed

| Item | Change |
|------|--------|
| New SQL migration | Create `is_admin()` function + replace RLS policy on `core_users` |
| Audit other tables | Check `crm_meetings`, `crm_proposals`, `crm_leads`, etc. for same recursive pattern |

No frontend code changes needed — once the RLS policy is fixed, the existing auth hook and sidebar will work correctly.

