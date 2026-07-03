/*
  # Create orders table

  1. New Tables
    - `orders`
      - `id` (bigint, primary key, auto-increment)
      - `name` (text, customer name)
      - `whatsapp` (text, customer WhatsApp number)
      - `items` (jsonb, ordered items with product details)
      - `total` (numeric, total order amount)
      - `transaction_id` (text, UPI transaction ID)
      - `status` (text, order status: Pending/Ready/Picked Up)
      - `created_at` (timestamptz, order creation timestamp)

  2. Security
    - Enable RLS on `orders` table
    - Add policy for public insert access (customers can place orders)
    - Add policy for authenticated users to read and update orders (admin functionality)

  3. Constraints
    - Ensure total amount is positive
    - Ensure status is one of the valid values
    - Ensure required fields are not null
*/

CREATE TABLE IF NOT EXISTS orders (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  whatsapp text NOT NULL,
  items jsonb NOT NULL,
  total numeric(10,2) NOT NULL CHECK (total > 0),
  transaction_id text NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ready', 'Picked Up')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow public insert access for placing orders
CREATE POLICY "Public can insert orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users to read and update orders (admin functionality)
CREATE POLICY "Authenticated users can manage orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);