/*
  # Create settings table with orders_enabled

  1. New Tables
    - `settings`
      - `id` (uuid, primary key)
      - `upi_id` (text) - UPI ID for payments
      - `qr_code_url` (text, nullable) - optional QR code image URL
      - `tagline` (text, nullable) - homepage tagline
      - `enable_quick_pay` (boolean, default true) - toggle quick pay button
      - `admin_password` (text, nullable) - hashed admin password
      - `orders_enabled` (boolean, default true) - shop open/closed toggle
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `settings` table
    - Public can read settings (needed for homepage/order page)
    - Public can update settings (admin uses same anon key pattern)
    - Public can insert settings (for first-time setup)

  3. Triggers
    - Auto-update `updated_at` on every update
*/

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text NOT NULL DEFAULT 'yourname@okaxis',
  qr_code_url text,
  tagline text DEFAULT 'Order delicious snacks on campus',
  enable_quick_pay boolean NOT NULL DEFAULT true,
  admin_password text,
  orders_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read settings"
  ON settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert settings"
  ON settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update settings"
  ON settings
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
