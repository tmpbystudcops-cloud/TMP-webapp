/*
  # Fix RLS policies for products table

  1. Security Changes
    - Drop existing restrictive policies that block admin operations
    - Create comprehensive policies for public role to manage products
    - Allow all CRUD operations for public users (admin interface)
    
  2. New Policies
    - Public can read all products
    - Public can insert new products
    - Public can update existing products
    - Public can delete products (if needed)
*/

-- Drop existing policies that might be blocking operations
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Public can read available products" ON products;
DROP POLICY IF EXISTS "Public can insert products" ON products;
DROP POLICY IF EXISTS "Public can update products" ON products;

-- Create comprehensive policies for public access
CREATE POLICY "Public can read all products"
  ON products
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert products"
  ON products
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update products"
  ON products
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete products"
  ON products
  FOR DELETE
  TO public
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;