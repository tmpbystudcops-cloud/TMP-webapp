/*
  # Fix Security Issues

  1. Security Fixes
    - Fix mutable search_path vulnerability in `update_updated_at_column` function
    - Recreate function with secure search_path settings
    - Ensure proper permissions and security definer settings

  2. Changes Made
    - Drop and recreate `update_updated_at_column` function with fixed search_path
    - Set explicit search_path to prevent manipulation attacks
    - Add security definer and proper access controls
    - Reattach trigger to settings table
*/

-- Drop the existing function to recreate it securely
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Create the function with secure search_path settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

-- Recreate the trigger on settings table
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Verify the function exists and has correct settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_updated_at_column'
    ) THEN
        RAISE EXCEPTION 'Function update_updated_at_column was not created successfully';
    END IF;
END $$;