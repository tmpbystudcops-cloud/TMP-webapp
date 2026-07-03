/*
  # Create products table

  1. New Tables
    - `products`
      - `id` (bigint, primary key, auto-increment)
      - `name` (text, product name)
      - `price` (numeric, product price)
      - `stock` (integer, available quantity)
      - `available` (boolean, whether product is available for ordering)
      - `created_at` (timestamptz, creation timestamp)

  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access to available products
    - Add policy for authenticated users to manage products (admin functionality)

  3. Sample Data
    - Insert 4 sample snack products with realistic prices and stock
*/

CREATE TABLE IF NOT EXISTS products (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to available products
CREATE POLICY "Public can read available products"
  ON products
  FOR SELECT
  TO public
  USING (available = true);

-- Allow all operations for authenticated users (admin functionality)
CREATE POLICY "Authenticated users can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample products
INSERT INTO products (name, price, stock, available) VALUES
  ('Maggi Noodles', 25.00, 50, true),
  ('Chips Packet', 20.00, 30, true),
  ('Chocolate Bar', 35.00, 25, true),
  ('Energy Drink', 45.00, 20, true)
ON CONFLICT DO NOTHING;