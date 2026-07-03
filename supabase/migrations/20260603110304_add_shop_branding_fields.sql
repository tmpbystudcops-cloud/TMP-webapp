/*
  # Add shop name and social media handle to settings

  1. Changes
    - Add `shop_name` (text) - Name of the shop
    - Add `instagram_handle` (text) - Instagram username without @

  2. Notes
    - shop_name is required with default value
    - instagram_handle is optional for social media linking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'shop_name'
  ) THEN
    ALTER TABLE settings ADD COLUMN shop_name text DEFAULT 'My Shop';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'instagram_handle'
  ) THEN
    ALTER TABLE settings ADD COLUMN instagram_handle text;
  END IF;
END $$;
