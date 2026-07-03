/*
  # Add unique order ID column to orders table

  1. Changes
    - Add `unique_order_id` column to orders table
    - Make it unique and not null
    - Add index for better performance

  2. Notes
    - This will store the customer-facing order ID that's used as payment note
    - Different from the internal database ID
*/

-- Add unique_order_id column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'unique_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN unique_order_id text;
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'orders' AND constraint_name = 'orders_unique_order_id_key'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_unique_order_id_key UNIQUE (unique_order_id);
  END IF;
END $$;

-- Create index for better performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'orders' AND indexname = 'idx_orders_unique_order_id'
  ) THEN
    CREATE INDEX idx_orders_unique_order_id ON orders (unique_order_id);
  END IF;
END $$;