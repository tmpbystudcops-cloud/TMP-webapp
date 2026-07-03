/*
  # Fix settings table defaults

  1. Changes
    - Remove hardcoded defaults from upi_id ('yourname@okaxis')
    - Remove hardcoded defaults from tagline ('Order delicious snacks on campus')
    - Remove hardcoded default from shop_name ('My Shop')
    - Set upi_id default to 'UPI ID'
    - Set tagline default to 'tagline'
    - Set shop_name default to 'Shop'

  2. Notes
    - Only placeholder defaults for UI purposes
    - Users must set actual values in admin settings
*/

DO $$
BEGIN
  -- Fix upi_id default
  ALTER TABLE settings
    ALTER COLUMN upi_id SET DEFAULT 'UPI ID';

  -- Fix tagline default if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE settings
      ALTER COLUMN tagline SET DEFAULT 'tagline';
  END IF;

  -- Fix shop_name default if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'shop_name'
  ) THEN
    ALTER TABLE settings
      ALTER COLUMN shop_name SET DEFAULT 'Shop';
  END IF;
END $$;
