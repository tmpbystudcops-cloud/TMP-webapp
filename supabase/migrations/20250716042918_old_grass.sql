/*
  # Add admin password column to settings table

  1. Changes
    - Add `admin_password` column to `settings` table
    - Set default value to 'Harishadmin1' for backward compatibility
    - Column is nullable to handle existing records

  2. Security
    - Password will be stored in database for persistence across sessions
    - Maintains existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'admin_password'
  ) THEN
    ALTER TABLE settings ADD COLUMN admin_password text DEFAULT 'Harishadmin1';
  END IF;
END $$;