/*
  # Fix remaining RLS and SECURITY DEFINER issues

  ## Changes

  1. **orders INSERT policy** — Replace the open `Public can insert orders` policy
     (WITH CHECK = true) with a policy that restricts INSERT to the service_role only.
     Customer orders are placed exclusively through the `process-order` edge function
     which uses the SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) and validates stock
     availability before inserting. Direct REST API inserts by anon users are no
     longer permitted, preventing arbitrary order creation with forged data.

  2. **update_updated_at_column() SECURITY DEFINER** — Revoke EXECUTE from the
     `public` role (which covers both anon and authenticated). This function is
     a trigger helper called by the table owner; it should not be callable via
     /rest/v1/rpc by any frontend client. Also revoke from anon and authenticated
     explicitly to guarantee no access.

  ## Notes
  - The `process-order` edge function uses the service_role key and bypasses RLS,
    so order creation still works correctly for legitimate customers.
  - The SELECT policy on orders remains open (customers need to read their own
    orders via the track-order page, and there is no auth to scope ownership).
*/

-- Replace open INSERT policy on orders with service_role-only access
-- (service_role bypasses RLS, so no INSERT policy is needed for it;
--  we simply remove the public INSERT policy entirely)
DROP POLICY IF EXISTS "Public can insert orders" ON orders;

-- Revoke EXECUTE on the SECURITY DEFINER trigger function from all public roles
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated;
