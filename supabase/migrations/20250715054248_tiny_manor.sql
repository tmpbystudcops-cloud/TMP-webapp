/*
  # Add enable_quick_pay column to settings table

  1. Changes
    - Add `enable_quick_pay` column to `settings` table
    - Set default value to `true` to enable quick pay by default
    - Column type is `boolean`

  2. Notes
    - This fixes the missing column error when updating settings
    - Existing settings records will have quick pay enabled by default
*/

-- Add the enable_quick_pay column to the settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'enable_quick_pay'
  ) THEN
    ALTER TABLE settings ADD COLUMN enable_quick_pay boolean DEFAULT true;
  END IF;
END $$;