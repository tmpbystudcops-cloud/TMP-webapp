/*
  # Add unique_order_id column to orders table

  1. Changes
    - Add `unique_order_id` (text, unique) column to orders table
    - Generate unique IDs for existing orders using format YYYYMMDD-<random>
    - This column will store customer-facing order tracking ID

  2. Important Notes
    - Non-nullable column with unique constraint to prevent duplicate order IDs
    - Used for customer-facing order tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'unique_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN unique_order_id text UNIQUE;
    
    -- Backfill existing orders with unique IDs if any exist
    UPDATE orders
    SET unique_order_id = to_char(created_at, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8)
    WHERE unique_order_id IS NULL;
    
    -- Make the column NOT NULL after backfilling
    ALTER TABLE orders ALTER COLUMN unique_order_id SET NOT NULL;
  END IF;
END $$;
