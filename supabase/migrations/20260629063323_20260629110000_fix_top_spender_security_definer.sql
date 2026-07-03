/*
  # Fix SECURITY DEFINER exposure on public.top_spender view

  ## Summary
  The `top_spender` view was created with the default PostgreSQL view behavior,
  which runs the view's query with the **owner's** privileges (the `postgres`
  superuser). This is effectively a SECURITY DEFINER view: any role with SELECT
  on the view could read the underlying `orders` rows even if RLS on `orders`
  were tightened to deny them access, because the view bypasses RLS by running
  as the table owner.

  This migration flips the view to `security_invoker = true` (PostgreSQL 15+,
  also supported via the `security_invoker` reloption on Supabase's Postgres).
  With this option set, the view's query runs with the **caller's** privileges
  and is subject to the RLS policies on the underlying `orders` table. This is
  the correct, safe default for a view that reads user data.

  ## Why this is safe here
  - The admin dashboard reads `top_spender` using the anon key.
  - The `anon` role already has SELECT on the underlying `orders` table, and
    `orders` has a public SELECT RLS policy (`Public can read all orders`).
  - Therefore the anon role can still read the view after the change; the only
    thing that changes is that the view no longer silently bypasses RLS.
  - The `service_role` (used by edge functions) bypasses RLS regardless, so
    edge-function reads of the view are unaffected.

  ## Changes
  1. Set `security_invoker = true` on `public.top_spender` so the view runs
     with the caller's privileges instead of the owner's.
  2. Re-grant SELECT on the view to `anon` and `authenticated` explicitly so
     the dashboard keeps working even after the privilege model changes.
  3. Revoke write privileges (INSERT/UPDATE/DELETE/TRUNCATE) that were
     auto-granted to `anon` and `authenticated` on the view — a read-only
     aggregate view should never accept writes.

  ## Notes
  - No data is changed or lost.
  - The view definition itself is unchanged; only its security property and
    grants are adjusted.
  - This is idempotent: re-running the migration is a no-op.
*/

-- 1. Make the view run with the caller's privileges (security_invoker = true),
--    so it respects RLS on the underlying orders table instead of bypassing it.
ALTER VIEW public.top_spender SET (security_invoker = true);

-- 2. Re-grant SELECT to the roles the dashboard reads as.
GRANT SELECT ON public.top_spender TO anon;
GRANT SELECT ON public.top_spender TO authenticated;

-- 3. Revoke write privileges that were auto-granted to public roles.
--    A read-only aggregate view should never accept writes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.top_spender FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.top_spender FROM authenticated;
