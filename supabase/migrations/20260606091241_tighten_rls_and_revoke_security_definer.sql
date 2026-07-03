/*
  # Tighten RLS policies and fix SECURITY DEFINER exposure

  ## Summary
  This migration addresses several security issues flagged by the RLS scanner:

  1. **products table** — Remove open INSERT/UPDATE/DELETE policies for the public role.
     All product mutations now go through the `admin-action` edge function (service_role),
     so the anon role needs no direct write access.

  2. **orders table** — Public INSERT stays (customers place orders). UPDATE is removed
     from the public role; order status changes go through the `admin-action` edge function.

  3. **settings table** — Remove open INSERT/UPDATE policies for the public role.
     All settings mutations go through the `admin-action` edge function.

  4. **update_updated_at_column()** — Revoke EXECUTE from anon and authenticated roles
     so the function is not callable via /rest/v1/rpc by arbitrary users.

  ## Notes
  - SELECT policies remain open (products/orders/settings are all public-read by design).
  - The `process-order` edge function uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS
    for order inserts and stock updates — those still work.
  - The `admin-action` edge function uses SUPABASE_SERVICE_ROLE_KEY and validates the
    admin password before performing any privileged mutation.
*/

-- ============================================================
-- products: remove open write policies
-- ============================================================
DROP POLICY IF EXISTS "Public can insert products" ON products;
DROP POLICY IF EXISTS "Public can update products" ON products;
DROP POLICY IF EXISTS "Public can delete products" ON products;

-- ============================================================
-- orders: remove open UPDATE policy (INSERT stays for customers)
-- ============================================================
DROP POLICY IF EXISTS "Public can update order status" ON orders;

-- ============================================================
-- settings: remove open INSERT/UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Public can insert settings" ON settings;
DROP POLICY IF EXISTS "Public can update settings" ON settings;

-- ============================================================
-- Revoke EXECUTE on SECURITY DEFINER trigger helper from public roles.
-- It is invoked by the trigger engine (as the table owner), not by users.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
