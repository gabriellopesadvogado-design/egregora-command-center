
-- Drop existing RESTRICTIVE policies on followup_steps
DROP POLICY IF EXISTS "Closers can view own followups" ON followup_steps;
DROP POLICY IF EXISTS "Closers can insert own followups" ON followup_steps;
DROP POLICY IF EXISTS "Closers can update own followups" ON followup_steps;
DROP POLICY IF EXISTS "Admin/Manager can delete followups" ON followup_steps;
DROP POLICY IF EXISTS "Block anonymous followup_steps" ON followup_steps;

-- Recreate as PERMISSIVE with proper command separation

-- SELECT: closer sees own, admin/manager sees all
CREATE POLICY "Closers can view own followups" ON followup_steps
  FOR SELECT TO authenticated USING (closer_id = auth.uid());

CREATE POLICY "Admins can view all followups" ON followup_steps
  FOR SELECT TO authenticated USING (is_admin_or_manager(auth.uid()));

-- INSERT: closer inserts own, admin/manager inserts any
CREATE POLICY "Closers can insert own followups" ON followup_steps
  FOR INSERT TO authenticated WITH CHECK (closer_id = auth.uid());

CREATE POLICY "Admins can insert followups" ON followup_steps
  FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager(auth.uid()));

-- UPDATE: closer updates own, admin/manager updates any
CREATE POLICY "Closers can update own followups" ON followup_steps
  FOR UPDATE TO authenticated
  USING (closer_id = auth.uid()) WITH CHECK (closer_id = auth.uid());

CREATE POLICY "Admins can update all followups" ON followup_steps
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- DELETE: admin/manager only
CREATE POLICY "Admins can delete followups" ON followup_steps
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- Block anon access
CREATE POLICY "Block anonymous followup_steps" ON followup_steps
  AS RESTRICTIVE FOR ALL TO anon USING (false);
