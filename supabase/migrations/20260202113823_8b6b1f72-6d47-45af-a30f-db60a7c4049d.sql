-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "View own meetings" ON public.meetings;

-- Create new policy allowing all authenticated users to view all meetings
CREATE POLICY "Authenticated users can view all meetings"
ON public.meetings
FOR SELECT
TO authenticated
USING (true);