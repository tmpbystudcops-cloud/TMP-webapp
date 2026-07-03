/*
  # Add tagline column to settings table

  1. Changes
    - Add `tagline` column to `settings` table
    - Set default value for existing records
    - Allow NULL values for flexibility

  2. Notes
    - This column will store the website tagline that admins can customize
    - Default value ensures existing settings records work properly
*/

-- Add tagline column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Order delicious snacks on campus';

-- Update any existing records to have the default tagline
UPDATE settings SET tagline = 'Order delicious snacks on campus' WHERE tagline IS NULL;