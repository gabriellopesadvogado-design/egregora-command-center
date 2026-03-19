-- Remove restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admin/Manager can view all profiles" ON profiles;

-- Allow all authenticated users to view all profiles (needed for closer selection, rankings, etc.)
CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT TO authenticated
USING (true);