/*
  # Update products table RLS policy

  1. Security Changes
    - Add policy for public users to insert products (for admin functionality)
    - Add policy for public users to update products (for admin functionality)
    - Keep existing policies for reading products

  Note: This allows the admin interface to work with public access while maintaining
  security through application-level password protection.
*/

-- Allow public users to insert products (for admin functionality)
CREATE POLICY "Public can insert products"
  ON products
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public users to update products (for admin functionality)  
CREATE POLICY "Public can update products"
  ON products
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);